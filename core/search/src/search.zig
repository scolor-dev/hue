const std = @import("std");
const windows = std.os.windows;

const HANDLE = windows.HANDLE;
const DWORD = windows.DWORD;
const WCHAR = windows.WCHAR;
const INVALID_HANDLE_VALUE = windows.INVALID_HANDLE_VALUE;

const MAX_PATH = 260;
const FILE_ATTRIBUTE_DIRECTORY: DWORD = 0x10;
const FILE_ATTRIBUTE_HIDDEN: DWORD = 0x02;
const MAX_RESULTS: usize = 2000;
const MAX_DEPTH: usize = 20;

const WIN32_FIND_DATAW = extern struct {
    dwFileAttributes: DWORD,
    ftCreationTime: windows.FILETIME,
    ftLastAccessTime: windows.FILETIME,
    ftLastWriteTime: windows.FILETIME,
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
) callconv(.winapi) i32;

extern "kernel32" fn FindClose(hFindFile: HANDLE) callconv(.winapi) i32;

const SearchEntry = struct {
    name: []const u8,
    path: []const u8,
    isDir: bool,
    isHidden: bool,
    size: i64,
    ext: []const u8,
};

fn searchDir(
    alloc: std.mem.Allocator,
    dir_utf8: []const u8,
    query_lower: []const u8,
    results: *std.array_list.Managed(SearchEntry),
    depth: usize,
) !void {
    if (depth > MAX_DEPTH or results.items.len >= MAX_RESULTS) return;

    const pattern_utf8 = try std.fmt.allocPrint(alloc, "{s}\\*", .{dir_utf8});
    const pattern_w = try std.unicode.utf8ToUtf16LeAllocZ(alloc, pattern_utf8);

    var find_data: WIN32_FIND_DATAW = undefined;
    const handle = FindFirstFileW(pattern_w, &find_data);
    if (handle == INVALID_HANDLE_VALUE) return;
    defer _ = FindClose(handle);

    while (true) {
        const name_w = std.mem.sliceTo(&find_data.cFileName, 0);
        const is_dot = name_w.len == 1 and name_w[0] == '.';
        const is_dotdot = name_w.len == 2 and name_w[0] == '.' and name_w[1] == '.';

        if (!is_dot and !is_dotdot) {
            const name_utf8 = try std.unicode.utf16LeToUtf8Alloc(alloc, name_w);
            const is_dir = find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY != 0;
            const is_hidden = find_data.dwFileAttributes & FILE_ATTRIBUTE_HIDDEN != 0;

            const name_lower = blk: {
                const buf = try alloc.dupe(u8, name_utf8);
                for (buf) |*c| c.* = std.ascii.toLower(c.*);
                break :blk buf;
            };

            if (std.mem.indexOf(u8, name_lower, query_lower) != null) {
                const full_path = try std.fmt.allocPrint(alloc, "{s}\\{s}", .{ dir_utf8, name_utf8 });
                const size: i64 = if (is_dir) 0
                    else (@as(i64, find_data.nFileSizeHigh) << 32) | @as(i64, find_data.nFileSizeLow);

                const ext_raw: []const u8 = if (is_dir) "" else blk: {
                    const dot = std.mem.lastIndexOfScalar(u8, name_utf8, '.') orelse break :blk "";
                    if (dot == 0) break :blk "";
                    break :blk name_utf8[dot..];
                };
                const ext = try alloc.dupe(u8, ext_raw);
                for (ext) |*c| c.* = std.ascii.toLower(c.*);

                try results.append(.{
                    .name = name_utf8,
                    .path = full_path,
                    .isDir = is_dir,
                    .isHidden = is_hidden,
                    .size = size,
                    .ext = ext,
                });
            }

            if (is_dir and results.items.len < MAX_RESULTS) {
                const child_path = try std.fmt.allocPrint(alloc, "{s}\\{s}", .{ dir_utf8, name_utf8 });
                try searchDir(alloc, child_path, query_lower, results, depth + 1);
            }
        }

        if (FindNextFileW(handle, &find_data) == 0) break;
    }
}

// Recursively search dir_utf8 for files/folders whose name contains query_utf8 (case-insensitive).
// Results are written as JSON to out_buf. Returns bytes written, or negative on error.
export fn hue_search(
    root_utf8: [*:0]const u8,
    query_utf8: [*:0]const u8,
    out_buf: [*]u8,
    buf_size: usize,
) i32 {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    const query = std.mem.span(query_utf8);
    const query_lower = blk: {
        const buf = alloc.dupe(u8, query) catch return -1;
        for (buf) |*c| c.* = std.ascii.toLower(c.*);
        break :blk buf;
    };

    var results = std.array_list.Managed(SearchEntry).init(alloc);
    if (query.len > 0) {
        searchDir(alloc, std.mem.span(root_utf8), query_lower, &results, 0) catch return -1;
    }

    var writer = std.Io.Writer.fixed(out_buf[0..buf_size]);
    std.json.fmt(results.items, .{}).format(&writer) catch return -2;
    return @intCast(writer.end);
}
