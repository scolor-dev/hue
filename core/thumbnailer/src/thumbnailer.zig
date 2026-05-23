const std = @import("std");
const windows = std.os.windows;

const HANDLE = windows.HANDLE;
const DWORD = windows.DWORD;
const WCHAR = windows.WCHAR;
const BOOL = windows.BOOL;

const HRESULT = i32;
const ULONG = u32;
const HBITMAP = HANDLE;
const HDC = HANDLE;

const S_OK: HRESULT = 0;
const COINIT_APARTMENTTHREADED: DWORD = 0x2;
const DIB_RGB_COLORS: DWORD = 0;
const BI_RGB: DWORD = 0;

const GUID = extern struct {
    Data1: u32,
    Data2: u16,
    Data3: u16,
    Data4: [8]u8,
};

// {BCC18B79-BA16-442F-80C4-8A59C30C463B}
const IID_IShellItemImageFactory = GUID{
    .Data1 = 0xbcc18b79,
    .Data2 = 0xba16,
    .Data3 = 0x442f,
    .Data4 = .{ 0x80, 0xc4, 0x8a, 0x59, 0xc3, 0x0c, 0x46, 0x3b },
};

const SIZE_W = extern struct { cx: i32, cy: i32 };

const IShellItemImageFactory = extern struct {
    vtbl: *const Vtbl,
    const Vtbl = extern struct {
        QueryInterface: *const fn (*IShellItemImageFactory, *const GUID, **anyopaque) callconv(.winapi) HRESULT,
        AddRef: *const fn (*IShellItemImageFactory) callconv(.winapi) ULONG,
        Release: *const fn (*IShellItemImageFactory) callconv(.winapi) ULONG,
        GetImage: *const fn (*IShellItemImageFactory, SIZE_W, DWORD, *HBITMAP) callconv(.winapi) HRESULT,
    };
};

const BITMAP_OBJ = extern struct {
    bmType: i32,
    bmWidth: i32,
    bmHeight: i32,
    bmWidthBytes: i32,
    bmPlanes: u16,
    bmBitsPixel: u16,
    bmBits: ?*anyopaque,
};

const BITMAPINFOHEADER = extern struct {
    biSize: DWORD,
    biWidth: i32,
    biHeight: i32,
    biPlanes: u16,
    biBitCount: u16,
    biCompression: DWORD,
    biSizeImage: DWORD,
    biXPelsPerMeter: i32,
    biYPelsPerMeter: i32,
    biClrUsed: DWORD,
    biClrImportant: DWORD,
};

const BITMAPINFO = extern struct {
    bmiHeader: BITMAPINFOHEADER,
    bmiColors: [1]DWORD,
};

extern "ole32" fn CoInitializeEx(?*anyopaque, DWORD) callconv(.winapi) HRESULT;
extern "ole32" fn CoUninitialize() callconv(.winapi) void;
extern "shell32" fn SHCreateItemFromParsingName(
    [*:0]const WCHAR,
    ?*anyopaque,
    *const GUID,
    *?*anyopaque,
) callconv(.winapi) HRESULT;
extern "gdi32" fn CreateCompatibleDC(?HDC) callconv(.winapi) ?HDC;
extern "gdi32" fn GetObjectW(HANDLE, i32, ?*anyopaque) callconv(.winapi) i32;
extern "gdi32" fn GetDIBits(HDC, HBITMAP, DWORD, DWORD, ?*anyopaque, *BITMAPINFO, DWORD) callconv(.winapi) i32;
extern "gdi32" fn DeleteDC(HDC) callconv(.winapi) BOOL;
extern "gdi32" fn DeleteObject(HANDLE) callconv(.winapi) BOOL;

const THUMB_SIZE: i32 = 128;

/// Generate a PNG thumbnail for the given file path.
/// Returns bytes written to out_buf, or -1 on error.
export fn hue_thumb_get(
    path_utf8: [*:0]const u8,
    out_buf: [*]u8,
    buf_size: usize,
) i32 {
    const out = out_buf[0..buf_size];

    const hr_init = CoInitializeEx(null, COINIT_APARTMENTTHREADED);
    if (hr_init < 0) return -1;
    defer CoUninitialize();

    var path_w: [1024]u16 = undefined;
    const path_slice = std.mem.span(path_utf8);
    const wlen = std.unicode.utf8ToUtf16Le(&path_w, path_slice) catch return -1;
    if (wlen >= path_w.len) return -1;
    path_w[wlen] = 0;

    var ppv: ?*anyopaque = null;
    if (SHCreateItemFromParsingName(@ptrCast(&path_w), null, &IID_IShellItemImageFactory, &ppv) != S_OK) return -1;
    const factory: *IShellItemImageFactory = @ptrCast(@alignCast(ppv.?));
    defer _ = factory.vtbl.Release(factory);

    var hbm: HBITMAP = undefined;
    if (factory.vtbl.GetImage(factory, .{ .cx = THUMB_SIZE, .cy = THUMB_SIZE }, 0, &hbm) != S_OK) return -1;
    defer _ = DeleteObject(hbm);

    var bm: BITMAP_OBJ = undefined;
    if (GetObjectW(hbm, @sizeOf(BITMAP_OBJ), &bm) == 0) return -1;
    const w: u32 = @intCast(@max(1, bm.bmWidth));
    const h: u32 = @intCast(@max(1, bm.bmHeight));

    const hdc = CreateCompatibleDC(null) orelse return -1;
    defer _ = DeleteDC(hdc);

    var bmi = BITMAPINFO{
        .bmiHeader = .{
            .biSize = @sizeOf(BITMAPINFOHEADER),
            .biWidth = @intCast(w),
            .biHeight = -@as(i32, @intCast(h)),
            .biPlanes = 1,
            .biBitCount = 32,
            .biCompression = BI_RGB,
            .biSizeImage = 0,
            .biXPelsPerMeter = 0,
            .biYPelsPerMeter = 0,
            .biClrUsed = 0,
            .biClrImportant = 0,
        },
        .bmiColors = .{0},
    };

    const pixels = std.heap.page_allocator.alloc(u8, w * h * 4) catch return -1;
    defer std.heap.page_allocator.free(pixels);

    if (GetDIBits(hdc, hbm, 0, h, pixels.ptr, &bmi, DIB_RGB_COLORS) <= 0) return -1;

    const n = encodePng(out, w, h, pixels) catch return -1;
    return @intCast(n);
}

// ── PNG encoder (uncompressed deflate, RGB) ────────────────────────────────

fn writeU32Be(buf: []u8, v: u32) void {
    buf[0] = @truncate(v >> 24);
    buf[1] = @truncate(v >> 16);
    buf[2] = @truncate(v >> 8);
    buf[3] = @truncate(v);
}

fn crc32Update(crc_in: u32, data: []const u8) u32 {
    var c = crc_in;
    for (data) |b| {
        c ^= b;
        for (0..8) |_| {
            c = if (c & 1 != 0) (c >> 1) ^ 0xedb88320 else c >> 1;
        }
    }
    return c;
}

fn writeChunk(out: []u8, chunk_type: *const [4]u8, data: []const u8) usize {
    var pos: usize = 0;
    writeU32Be(out[pos..], @intCast(data.len));
    pos += 4;
    @memcpy(out[pos .. pos + 4], chunk_type);
    pos += 4;
    if (data.len > 0) {
        @memcpy(out[pos .. pos + data.len], data);
        pos += data.len;
    }
    var crc = crc32Update(0xffffffff, chunk_type);
    crc = crc32Update(crc, data);
    writeU32Be(out[pos..], crc ^ 0xffffffff);
    pos += 4;
    return pos;
}

fn encodePng(out: []u8, w: u32, h: u32, bgra: []const u8) !usize {
    var pos: usize = 0;

    const png_sig = [8]u8{ 0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n' };
    @memcpy(out[pos .. pos + 8], &png_sig);
    pos += 8;

    // IHDR
    var ihdr: [13]u8 = undefined;
    writeU32Be(ihdr[0..4], w);
    writeU32Be(ihdr[4..8], h);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // RGB
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    pos += writeChunk(out[pos..], "IHDR", &ihdr);

    // IDAT: zlib header + deflate stored block + adler32
    const raw_size = h * (1 + w * 3); // filter byte + RGB per row
    if (raw_size > 65535) return error.TooLarge;

    const idat_payload = 2 + 5 + raw_size + 4;
    writeU32Be(out[pos..], @intCast(idat_payload));
    pos += 4;

    const idat_type_pos = pos;
    @memcpy(out[pos .. pos + 4], "IDAT");
    pos += 4;
    const idat_data_pos = pos;

    // zlib header (CMF=0x78 FLG=0x01; 0x7801 % 31 == 0)
    out[pos] = 0x78;
    pos += 1;
    out[pos] = 0x01;
    pos += 1;

    // deflate BFINAL=1 BTYPE=00 (stored)
    out[pos] = 0x01;
    pos += 1;
    const rlen: u16 = @intCast(raw_size);
    out[pos] = @truncate(rlen);
    pos += 1;
    out[pos] = @truncate(rlen >> 8);
    pos += 1;
    out[pos] = @truncate(~rlen);
    pos += 1;
    out[pos] = @truncate((~rlen) >> 8);
    pos += 1;

    // raw scanlines + compute adler32 inline
    var s1: u32 = 1;
    var s2: u32 = 0;

    var row: u32 = 0;
    while (row < h) : (row += 1) {
        out[pos] = 0; // filter: None
        pos += 1;
        // filter byte doesn't change s1 (adding 0) but still updates s2
        s2 = (s2 + s1) % 65521;

        var col: u32 = 0;
        while (col < w) : (col += 1) {
            const bi = (row * w + col) * 4;
            // BGRA → RGB
            const r = bgra[bi + 2];
            const g = bgra[bi + 1];
            const b = bgra[bi + 0];
            out[pos] = r;
            out[pos + 1] = g;
            out[pos + 2] = b;
            pos += 3;
            s1 = (s1 + r) % 65521;
            s2 = (s2 + s1) % 65521;
            s1 = (s1 + g) % 65521;
            s2 = (s2 + s1) % 65521;
            s1 = (s1 + b) % 65521;
            s2 = (s2 + s1) % 65521;
        }
    }

    // adler32 (big-endian)
    writeU32Be(out[pos..], (s2 << 16) | s1);
    pos += 4;

    // CRC over "IDAT" + payload
    var crc = crc32Update(0xffffffff, out[idat_type_pos .. idat_type_pos + 4]);
    crc = crc32Update(crc, out[idat_data_pos..pos]);
    writeU32Be(out[pos..], crc ^ 0xffffffff);
    pos += 4;

    // IEND
    pos += writeChunk(out[pos..], "IEND", &[0]u8{});

    return pos;
}
