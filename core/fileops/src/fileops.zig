const std = @import("std");
const windows = std.os.windows;

const HANDLE = windows.HANDLE;
const DWORD = windows.DWORD;
const WCHAR = windows.WCHAR;
const INVALID_HANDLE_VALUE = windows.INVALID_HANDLE_VALUE;

const MAX_PATH = 260;
const FILE_ATTRIBUTE_DIRECTORY: DWORD = 0x10;
const MOVEFILE_REPLACE_EXISTING: DWORD = 0x01;
const MOVEFILE_COPY_ALLOWED: DWORD = 0x02;

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

extern "kernel32" fn CopyFileExW(
    lpExistingFileName: [*:0]const WCHAR,
    lpNewFileName: [*:0]const WCHAR,
    lpProgressRoutine: ?*anyopaque,
    lpData: ?*anyopaque,
    pbCancel: ?*i32,
    dwCopyFlags: DWORD,
) callconv(.winapi) i32;

extern "kernel32" fn MoveFileExW(
    lpExistingFileName: [*:0]const WCHAR,
    lpNewFileName: [*:0]const WCHAR,
    dwFlags: DWORD,
) callconv(.winapi) i32;

extern "kernel32" fn DeleteFileW(
    lpFileName: [*:0]const WCHAR,
) callconv(.winapi) i32;

extern "kernel32" fn RemoveDirectoryW(
    lpPathName: [*:0]const WCHAR,
) callconv(.winapi) i32;

extern "kernel32" fn CreateDirectoryW(
    lpPathName: [*:0]const WCHAR,
    lpSecurityAttributes: ?*anyopaque,
) callconv(.winapi) i32;

extern "kernel32" fn GetFileAttributesW(
    lpFileName: [*:0]const WCHAR,
) callconv(.winapi) DWORD;

extern "kernel32" fn FindFirstFileW(
    lpFileName: [*:0]const WCHAR,
    lpFindFileData: *WIN32_FIND_DATAW,
) callconv(.winapi) HANDLE;

extern "kernel32" fn FindNextFileW(
    hFindFile: HANDLE,
    lpFindFileData: *WIN32_FIND_DATAW,
) callconv(.winapi) i32;

extern "kernel32" fn FindClose(hFindFile: HANDLE) callconv(.winapi) i32;

fn isDirectory(path_w: [*:0]const WCHAR) bool {
    const attrs = GetFileAttributesW(path_w);
    if (attrs == 0xFFFFFFFF) return false;
    return attrs & FILE_ATTRIBUTE_DIRECTORY != 0;
}

fn copyDirRecursive(alloc: std.mem.Allocator, src_utf8: []const u8, dst_utf8: []const u8) !void {
    const dst_w = try std.unicode.utf8ToUtf16LeAllocZ(alloc, dst_utf8);
    _ = CreateDirectoryW(dst_w, null);

    const pattern_utf8 = try std.fmt.allocPrint(alloc, "{s}\\*", .{src_utf8});
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
            const child_src = try std.fmt.allocPrint(alloc, "{s}\\{s}", .{ src_utf8, name_utf8 });
            const child_dst = try std.fmt.allocPrint(alloc, "{s}\\{s}", .{ dst_utf8, name_utf8 });

            if (find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY != 0) {
                try copyDirRecursive(alloc, child_src, child_dst);
            } else {
                const child_src_w = try std.unicode.utf8ToUtf16LeAllocZ(alloc, child_src);
                const child_dst_w = try std.unicode.utf8ToUtf16LeAllocZ(alloc, child_dst);
                if (CopyFileExW(child_src_w, child_dst_w, null, null, null, 0) == 0) return error.CopyFailed;
            }
        }

        if (FindNextFileW(handle, &find_data) == 0) break;
    }
}

fn deleteDirRecursive(alloc: std.mem.Allocator, path_utf8: []const u8) !void {
    const pattern_utf8 = try std.fmt.allocPrint(alloc, "{s}\\*", .{path_utf8});
    const pattern_w = try std.unicode.utf8ToUtf16LeAllocZ(alloc, pattern_utf8);

    var find_data: WIN32_FIND_DATAW = undefined;
    const handle = FindFirstFileW(pattern_w, &find_data);
    if (handle != INVALID_HANDLE_VALUE) {
        defer _ = FindClose(handle);

        while (true) {
            const name_w = std.mem.sliceTo(&find_data.cFileName, 0);
            const is_dot = name_w.len == 1 and name_w[0] == '.';
            const is_dotdot = name_w.len == 2 and name_w[0] == '.' and name_w[1] == '.';

            if (!is_dot and !is_dotdot) {
                const name_utf8 = try std.unicode.utf16LeToUtf8Alloc(alloc, name_w);
                const child_utf8 = try std.fmt.allocPrint(alloc, "{s}\\{s}", .{ path_utf8, name_utf8 });

                if (find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY != 0) {
                    try deleteDirRecursive(alloc, child_utf8);
                } else {
                    const child_w = try std.unicode.utf8ToUtf16LeAllocZ(alloc, child_utf8);
                    _ = DeleteFileW(child_w);
                }
            }

            if (FindNextFileW(handle, &find_data) == 0) break;
        }
    }

    const dir_w = try std.unicode.utf8ToUtf16LeAllocZ(alloc, path_utf8);
    if (RemoveDirectoryW(dir_w) == 0) return error.DeleteFailed;
}

// Copy file or directory (recursively) from src to dst.
// Returns 0 on success, negative on error.
export fn hue_copy_path(src_utf8: [*:0]const u8, dst_utf8: [*:0]const u8) i32 {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    const src = std.mem.span(src_utf8);
    const dst = std.mem.span(dst_utf8);

    const src_w = std.unicode.utf8ToUtf16LeAllocZ(alloc, src) catch return -1;
    const dst_w = std.unicode.utf8ToUtf16LeAllocZ(alloc, dst) catch return -1;

    if (isDirectory(src_w)) {
        copyDirRecursive(alloc, src, dst) catch return -2;
    } else {
        if (CopyFileExW(src_w, dst_w, null, null, null, 0) == 0) return -3;
    }
    return 0;
}

// Move file or directory from src to dst (cross-drive aware).
// Returns 0 on success, negative on error.
export fn hue_move_path(src_utf8: [*:0]const u8, dst_utf8: [*:0]const u8) i32 {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    const src = std.mem.span(src_utf8);
    const dst = std.mem.span(dst_utf8);

    const src_w = std.unicode.utf8ToUtf16LeAllocZ(alloc, src) catch return -1;
    const dst_w = std.unicode.utf8ToUtf16LeAllocZ(alloc, dst) catch return -1;

    if (MoveFileExW(src_w, dst_w, MOVEFILE_REPLACE_EXISTING | MOVEFILE_COPY_ALLOWED) == 0) return -2;
    return 0;
}

// Delete file or directory (recursively).
// Returns 0 on success, negative on error.
export fn hue_delete_path(path_utf8: [*:0]const u8) i32 {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    const path = std.mem.span(path_utf8);
    const path_w = std.unicode.utf8ToUtf16LeAllocZ(alloc, path) catch return -1;

    if (isDirectory(path_w)) {
        deleteDirRecursive(alloc, path) catch return -2;
    } else {
        if (DeleteFileW(path_w) == 0) return -2;
    }
    return 0;
}
