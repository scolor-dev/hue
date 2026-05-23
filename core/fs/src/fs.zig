const std = @import("std");
const windows = std.os.windows;

// ── Windows types ──────────────────────────────────────────────────────────

const HANDLE = windows.HANDLE;
const DWORD = windows.DWORD;
const WCHAR = windows.WCHAR;
const BOOL = windows.BOOL;
const FILETIME = windows.FILETIME;
const INVALID_HANDLE_VALUE = windows.INVALID_HANDLE_VALUE;

const FILE_ATTRIBUTE_DIRECTORY: DWORD = 0x10;
const MAX_PATH = 260;

const WIN32_FIND_DATAW = extern struct {
    dwFileAttributes: DWORD,
    ftCreationTime: FILETIME,
    ftLastAccessTime: FILETIME,
    ftLastWriteTime: FILETIME,
    nFileSizeHigh: DWORD,
    nFileSizeLow: DWORD,
    dwReserved0: DWORD,
    dwReserved1: DWORD,
    cFileName: [MAX_PATH]WCHAR,
    cAlternateFileName: [14]WCHAR,
};

extern "kernel32" fn FindFirstFileW(
    lpFileName: [*:0]const WCHAR,
    lpFindFileData: *WIN32_FIND_DATAW,
) callconv(.winapi) HANDLE;

extern "kernel32" fn FindNextFileW(
    hFindFile: HANDLE,
    lpFindFileData: *WIN32_FIND_DATAW,
) callconv(.winapi) BOOL;

extern "kernel32" fn FindClose(hFindFile: HANDLE) callconv(.winapi) BOOL;

// ── Entry struct ───────────────────────────────────────────────────────────

const Entry = struct {
    name: []const u8,
    isDir: bool,
    size: i64,
    modTime: []const u8,
    ext: []const u8,
};

// ── Exported function ──────────────────────────────────────────────────────

/// List directory contents as JSON.
/// Returns bytes written to out_buf, or -1 on error.
export fn hue_list_dir(
    path_utf8: [*:0]const u8,
    out_buf: [*]u8,
    buf_size: usize,
) i32 {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    const n = listDir(alloc, std.mem.span(path_utf8), out_buf[0..buf_size]) catch return -1;
    return @intCast(n);
}

// ── Implementation ─────────────────────────────────────────────────────────

fn listDir(alloc: std.mem.Allocator, path_utf8: []const u8, out: []u8) !usize {
    const pattern_utf8 = try std.fmt.allocPrint(alloc, "{s}\\*", .{path_utf8});
    const pattern_w = try std.unicode.utf8ToUtf16LeAllocZ(alloc, pattern_utf8);

    var find_data: WIN32_FIND_DATAW = undefined;
    const handle = FindFirstFileW(pattern_w.ptr, &find_data);
    if (handle == INVALID_HANDLE_VALUE) return error.AccessDenied;
    defer _ = FindClose(handle);

    var list = std.array_list.Managed(Entry).init(alloc);

    while (true) {
        const name_w = std.mem.sliceTo(&find_data.cFileName, 0);

        const is_dot = name_w.len == 1 and name_w[0] == '.';
        const is_dotdot = name_w.len == 2 and name_w[0] == '.' and name_w[1] == '.';

        if (!is_dot and !is_dotdot) {
            const name = try std.unicode.utf16LeToUtf8Alloc(alloc, name_w);
            const is_dir = find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY != 0;
            const size: i64 = if (is_dir) 0
                else (@as(i64, find_data.nFileSizeHigh) << 32) | @as(i64, find_data.nFileSizeLow);
            const mod_time = filetimeToStr(alloc, find_data.ftLastWriteTime) catch "";

            const ext_raw: []const u8 = if (is_dir) "" else blk: {
                const dot = std.mem.lastIndexOfScalar(u8, name, '.') orelse break :blk "";
                if (dot == 0) break :blk "";
                break :blk name[dot..];
            };
            const ext = try alloc.dupe(u8, ext_raw);
            for (ext) |*c| c.* = std.ascii.toLower(c.*);

            try list.append(.{
                .name = name,
                .isDir = is_dir,
                .size = size,
                .modTime = mod_time,
                .ext = ext,
            });
        }

        if (FindNextFileW(handle, &find_data) == .FALSE) break;
    }

    std.mem.sort(Entry, list.items, {}, struct {
        fn lt(_: void, a: Entry, b: Entry) bool {
            if (a.isDir != b.isDir) return a.isDir;
            return cmpIgnoreCase(a.name, b.name);
        }
    }.lt);

    var writer = std.Io.Writer.fixed(out);
    try std.json.fmt(list.items, .{}).format(&writer);
    return writer.end;
}

fn filetimeToStr(alloc: std.mem.Allocator, ft: FILETIME) ![]const u8 {
    const ticks: u64 = (@as(u64, ft.dwHighDateTime) << 32) | ft.dwLowDateTime;
    const unix_ticks = if (ticks > 116444736000000000) ticks - 116444736000000000 else 0;
    const secs: u64 = unix_ticks / 10_000_000;
    const ep = std.time.epoch.EpochSeconds{ .secs = secs };
    const yd = ep.getEpochDay().calculateYearDay();
    const md = yd.calculateMonthDay();
    const ds = ep.getDaySeconds();
    return std.fmt.allocPrint(alloc, "{d:0>4}-{d:0>2}-{d:0>2} {d:0>2}:{d:0>2}", .{
        yd.year,
        @intFromEnum(md.month),
        md.day_index + 1,
        ds.getHoursIntoDay(),
        ds.getMinutesIntoHour(),
    });
}

fn cmpIgnoreCase(a: []const u8, b: []const u8) bool {
    const n = @min(a.len, b.len);
    for (0..n) |i| {
        const ca = std.ascii.toLower(a[i]);
        const cb = std.ascii.toLower(b[i]);
        if (ca < cb) return true;
        if (ca > cb) return false;
    }
    return a.len < b.len;
}
