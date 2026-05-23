const std = @import("std");
const windows = std.os.windows;

const HANDLE = windows.HANDLE;
const DWORD = windows.DWORD;
const WCHAR = windows.WCHAR;
const BOOL = windows.BOOL;
const INVALID_HANDLE_VALUE = windows.INVALID_HANDLE_VALUE;

const GENERIC_READ: DWORD = 0x80000000;
const FILE_SHARE_READ: DWORD = 0x0001;
const OPEN_EXISTING: DWORD = 3;
const FILE_ATTRIBUTE_NORMAL: DWORD = 0x80;

extern "kernel32" fn CreateFileW(
    lpFileName: [*:0]const WCHAR,
    dwDesiredAccess: DWORD,
    dwShareMode: DWORD,
    lpSecurityAttributes: ?*anyopaque,
    dwCreationDisposition: DWORD,
    dwFlagsAndAttributes: DWORD,
    hTemplateFile: ?HANDLE,
) callconv(.winapi) HANDLE;

extern "kernel32" fn ReadFile(
    hFile: HANDLE,
    lpBuffer: *anyopaque,
    nNumberOfBytesToRead: DWORD,
    lpNumberOfBytesRead: *DWORD,
    lpOverlapped: ?*anyopaque,
) callconv(.winapi) BOOL;

extern "kernel32" fn GetFileSizeEx(
    hFile: HANDLE,
    lpFileSize: *i64,
) callconv(.winapi) BOOL;

const READ_SIZE: usize = 4096;
const HEX_DUMP_BYTES: usize = 256;

/// Read a file preview and return JSON.
/// JSON shape: { "isText": bool, "content": string, "truncated": bool, "fileSize": number }
/// Returns bytes written, or -1 on error.
export fn hue_preview_get(
    path_utf8: [*:0]const u8,
    out_buf: [*]u8,
    buf_size: usize,
) i32 {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    const n = previewFile(alloc, std.mem.span(path_utf8), out_buf[0..buf_size]) catch return -1;
    return @intCast(n);
}

fn previewFile(alloc: std.mem.Allocator, path_utf8: []const u8, out: []u8) !usize {
    const path_w = try std.unicode.utf8ToUtf16LeAllocZ(alloc, path_utf8);

    const handle = CreateFileW(
        path_w.ptr,
        GENERIC_READ,
        FILE_SHARE_READ,
        null,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        null,
    );
    if (handle == INVALID_HANDLE_VALUE) return error.OpenFailed;
    defer windows.CloseHandle(handle);

    var file_size: i64 = 0;
    _ = GetFileSizeEx(handle, &file_size);

    var raw: [READ_SIZE]u8 = undefined;
    var bytes_read: DWORD = 0;
    const to_read: DWORD = @intCast(@min(READ_SIZE, @as(usize, @intCast(@max(0, file_size)))));
    _ = ReadFile(handle, &raw, to_read, &bytes_read, null);
    const data = raw[0..bytes_read];

    const truncated = file_size > READ_SIZE;

    if (isBinary(data)) {
        const hex = try hexDump(alloc, data[0..@min(data.len, HEX_DUMP_BYTES)]);
        return writeJson(out, false, hex, truncated, file_size);
    } else {
        const text = try sanitizeUtf8(alloc, data);
        return writeJson(out, true, text, truncated, file_size);
    }
}

fn isBinary(data: []const u8) bool {
    for (data) |b| {
        if (b == 0) return true;
    }
    return false;
}

fn hexDump(alloc: std.mem.Allocator, data: []const u8) ![]const u8 {
    const hex_chars = "0123456789abcdef";
    // "XX " per byte, minus trailing space
    const result = try alloc.alloc(u8, data.len * 3);
    var pos: usize = 0;
    for (data, 0..) |b, i| {
        if (i > 0) {
            result[pos] = if (i % 16 == 0) '\n' else ' ';
            pos += 1;
        }
        result[pos] = hex_chars[b >> 4];
        result[pos + 1] = hex_chars[b & 0xf];
        pos += 2;
    }
    return result[0..pos];
}

fn sanitizeUtf8(alloc: std.mem.Allocator, data: []const u8) ![]const u8 {
    if (std.unicode.utf8ValidateSlice(data)) return data;

    var result = try alloc.alloc(u8, data.len);
    var in_i: usize = 0;
    var out_i: usize = 0;
    while (in_i < data.len) {
        const b = data[in_i];
        if (b < 0x80) {
            result[out_i] = b;
            out_i += 1;
            in_i += 1;
        } else {
            const seq_len = std.unicode.utf8ByteSequenceLength(b) catch {
                result[out_i] = '?';
                out_i += 1;
                in_i += 1;
                continue;
            };
            if (in_i + seq_len <= data.len) {
                const seq = data[in_i .. in_i + seq_len];
                _ = std.unicode.utf8Decode(seq) catch {
                    result[out_i] = '?';
                    out_i += 1;
                    in_i += 1;
                    continue;
                };
                @memcpy(result[out_i .. out_i + seq_len], seq);
                out_i += seq_len;
                in_i += seq_len;
            } else {
                result[out_i] = '?';
                out_i += 1;
                in_i += 1;
            }
        }
    }
    return result[0..out_i];
}

// ── JSON writer ────────────────────────────────────────────────────────────

fn writeJson(out: []u8, is_text: bool, content: []const u8, truncated: bool, file_size: i64) !usize {
    var pos: usize = 0;

    pos += write(out[pos..], "{\"isText\":");
    pos += write(out[pos..], if (is_text) "true" else "false");
    pos += write(out[pos..], ",\"content\":");
    pos += try writeJsonStr(out[pos..], content);
    pos += write(out[pos..], ",\"truncated\":");
    pos += write(out[pos..], if (truncated) "true" else "false");
    pos += write(out[pos..], ",\"fileSize\":");
    var num_buf: [20]u8 = undefined;
    const num_str = try std.fmt.bufPrint(&num_buf, "{d}", .{file_size});
    pos += write(out[pos..], num_str);
    out[pos] = '}';
    pos += 1;
    return pos;
}

fn write(out: []u8, s: []const u8) usize {
    @memcpy(out[0..s.len], s);
    return s.len;
}

fn writeJsonStr(out: []u8, s: []const u8) !usize {
    var pos: usize = 0;
    out[pos] = '"';
    pos += 1;
    for (s) |b| {
        switch (b) {
            '"'  => { out[pos] = '\\'; out[pos+1] = '"';  pos += 2; },
            '\\' => { out[pos] = '\\'; out[pos+1] = '\\'; pos += 2; },
            '\n' => { out[pos] = '\\'; out[pos+1] = 'n';  pos += 2; },
            '\r' => { out[pos] = '\\'; out[pos+1] = 'r';  pos += 2; },
            '\t' => { out[pos] = '\\'; out[pos+1] = 't';  pos += 2; },
            0x00...0x08, 0x0b...0x0c, 0x0e...0x1f => {
                const hex = "0123456789abcdef";
                out[pos] = '\\'; out[pos+1] = 'u';
                out[pos+2] = '0'; out[pos+3] = '0';
                out[pos+4] = hex[b >> 4]; out[pos+5] = hex[b & 0xf];
                pos += 6;
            },
            else => { out[pos] = b; pos += 1; },
        }
    }
    out[pos] = '"';
    pos += 1;
    return pos;
}
