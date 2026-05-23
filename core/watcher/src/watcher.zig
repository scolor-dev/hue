const std = @import("std");
const windows = std.os.windows;

const HANDLE = windows.HANDLE;
const DWORD = windows.DWORD;
const BOOL = windows.BOOL;
const WCHAR = windows.WCHAR;
const INVALID_HANDLE_VALUE = windows.INVALID_HANDLE_VALUE;

// ── Win32 constants ────────────────────────────────────────────────────────

const FILE_LIST_DIRECTORY: DWORD = 0x0001;
const FILE_SHARE_READ: DWORD = 0x0001;
const FILE_SHARE_WRITE: DWORD = 0x0002;
const FILE_SHARE_DELETE: DWORD = 0x0004;
const OPEN_EXISTING: DWORD = 3;
const FILE_FLAG_BACKUP_SEMANTICS: DWORD = 0x02000000;

const FILE_NOTIFY_CHANGE_FILE_NAME: DWORD = 0x0001;
const FILE_NOTIFY_CHANGE_DIR_NAME: DWORD = 0x0002;
const FILE_NOTIFY_CHANGE_SIZE: DWORD = 0x0008;
const FILE_NOTIFY_CHANGE_LAST_WRITE: DWORD = 0x0010;

const NOTIFY_FILTER: DWORD =
    FILE_NOTIFY_CHANGE_FILE_NAME |
    FILE_NOTIFY_CHANGE_DIR_NAME |
    FILE_NOTIFY_CHANGE_SIZE |
    FILE_NOTIFY_CHANGE_LAST_WRITE;

const INFINITE: DWORD = 0xFFFFFFFF;

// ── Win32 function declarations ────────────────────────────────────────────

extern "kernel32" fn CreateFileW(
    lpFileName: [*:0]const WCHAR,
    dwDesiredAccess: DWORD,
    dwShareMode: DWORD,
    lpSecurityAttributes: ?*anyopaque,
    dwCreationDisposition: DWORD,
    dwFlagsAndAttributes: DWORD,
    hTemplateFile: ?HANDLE,
) callconv(.winapi) HANDLE;

extern "kernel32" fn ReadDirectoryChangesW(
    hDirectory: HANDLE,
    lpBuffer: *anyopaque,
    nBufferLength: DWORD,
    bWatchSubtree: BOOL,
    dwNotifyFilter: DWORD,
    lpBytesReturned: *DWORD,
    lpOverlapped: ?*anyopaque,
    lpCompletionRoutine: ?*anyopaque,
) callconv(.winapi) BOOL;

extern "kernel32" fn CreateThread(
    lpThreadAttributes: ?*anyopaque,
    dwStackSize: usize,
    lpStartAddress: *const fn (?*anyopaque) callconv(.winapi) DWORD,
    lpParameter: ?*anyopaque,
    dwCreationFlags: DWORD,
    lpThreadId: ?*DWORD,
) callconv(.winapi) ?HANDLE;

extern "kernel32" fn WaitForSingleObject(
    hHandle: HANDLE,
    dwMilliseconds: DWORD,
) callconv(.winapi) DWORD;

// ── Global watcher state (one directory at a time) ─────────────────────────

var g_dir_handle: HANDLE = INVALID_HANDLE_VALUE;
var g_thread: ?HANDLE = null;
var g_running: bool = false;
var g_has_change: bool = false;

// ── Thread function ────────────────────────────────────────────────────────

fn watchThread(_: ?*anyopaque) callconv(.winapi) DWORD {
    var buf: [8192]u8 align(4) = undefined;
    var bytes: DWORD = 0;

    while (g_running) {
        const ok = ReadDirectoryChangesW(
            g_dir_handle,
            &buf,
            @intCast(buf.len),
            BOOL.fromBool(false),
            NOTIFY_FILTER,
            &bytes,
            null,
            null,
        );
        if (ok.toBool() and g_running) {
            g_has_change = true;
        }
    }
    return 0;
}

// ── Exported functions ─────────────────────────────────────────────────────

/// Start watching a directory. Returns 0 on success, -1 on error.
export fn hue_watch_start(path_utf8: [*:0]const u8) i32 {
    hue_watch_stop();

    var path_buf: [1024]u16 = undefined;
    const path_slice = std.mem.span(path_utf8);
    const len = std.unicode.utf8ToUtf16Le(&path_buf, path_slice) catch return -1;
    if (len >= path_buf.len) return -1;
    path_buf[len] = 0;

    const handle = CreateFileW(
        @ptrCast(&path_buf),
        FILE_LIST_DIRECTORY,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        null,
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS,
        null,
    );
    if (handle == INVALID_HANDLE_VALUE) return -1;

    g_dir_handle = handle;
    g_has_change = false;
    g_running = true;

    g_thread = CreateThread(null, 0, watchThread, null, 0, null);
    if (g_thread == null) {
        windows.CloseHandle(g_dir_handle);
        g_dir_handle = INVALID_HANDLE_VALUE;
        g_running = false;
        return -1;
    }
    return 0;
}

/// Stop watching. Safe to call even if not watching.
export fn hue_watch_stop() void {
    if (!g_running) return;
    g_running = false;
    if (g_dir_handle != INVALID_HANDLE_VALUE) {
        windows.CloseHandle(g_dir_handle);
        g_dir_handle = INVALID_HANDLE_VALUE;
    }
    if (g_thread) |t| {
        _ = WaitForSingleObject(t, 2000);
        windows.CloseHandle(t);
        g_thread = null;
    }
}

/// Returns true if changes were detected since last call. Clears the flag.
export fn hue_watch_has_change() bool {
    const v = g_has_change;
    g_has_change = false;
    return v;
}
