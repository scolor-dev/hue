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
const FILE_FLAG_OVERLAPPED: DWORD = 0x40000000;

const FILE_NOTIFY_CHANGE_FILE_NAME: DWORD = 0x0001;
const FILE_NOTIFY_CHANGE_DIR_NAME: DWORD = 0x0002;
const FILE_NOTIFY_CHANGE_SIZE: DWORD = 0x0008;
const FILE_NOTIFY_CHANGE_LAST_WRITE: DWORD = 0x0010;

const NOTIFY_FILTER: DWORD =
    FILE_NOTIFY_CHANGE_FILE_NAME |
    FILE_NOTIFY_CHANGE_DIR_NAME |
    FILE_NOTIFY_CHANGE_SIZE |
    FILE_NOTIFY_CHANGE_LAST_WRITE;

const WAIT_OBJECT_0: DWORD = 0x00000000;
const INFINITE: DWORD = 0xFFFFFFFF;

// ── OVERLAPPED ─────────────────────────────────────────────────────────────

const OVERLAPPED = extern struct {
    Internal: usize = 0,
    InternalHigh: usize = 0,
    Offset: DWORD = 0,
    OffsetHigh: DWORD = 0,
    hEvent: ?HANDLE = null,
};

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
    lpBytesReturned: ?*DWORD,
    lpOverlapped: *OVERLAPPED,
    lpCompletionRoutine: ?*anyopaque,
) callconv(.winapi) BOOL;

extern "kernel32" fn CreateEventW(
    lpEventAttributes: ?*anyopaque,
    bManualReset: BOOL,
    bInitialState: BOOL,
    lpName: ?[*:0]const WCHAR,
) callconv(.winapi) ?HANDLE;

extern "kernel32" fn SetEvent(hEvent: HANDLE) callconv(.winapi) BOOL;
extern "kernel32" fn ResetEvent(hEvent: HANDLE) callconv(.winapi) BOOL;

extern "kernel32" fn WaitForMultipleObjects(
    nCount: DWORD,
    lpHandles: [*]const HANDLE,
    bWaitAll: BOOL,
    dwMilliseconds: DWORD,
) callconv(.winapi) DWORD;

extern "kernel32" fn CancelIo(hFile: HANDLE) callconv(.winapi) BOOL;

extern "kernel32" fn GetOverlappedResult(
    hFile: HANDLE,
    lpOverlapped: *OVERLAPPED,
    lpNumberOfBytesTransferred: *DWORD,
    bWait: BOOL,
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

// ── Global watcher state ───────────────────────────────────────────────────

var g_dir_handle: HANDLE = INVALID_HANDLE_VALUE;
var g_thread: ?HANDLE = null;
var g_stop_event: ?HANDLE = null;  // SetEvent で即時停止
var g_change_event: ?HANDLE = null; // OVERLAPPED の完了通知
var g_running: bool = false;
var g_has_change: bool = false;

// ── Thread function ────────────────────────────────────────────────────────

fn watchThread(_: ?*anyopaque) callconv(.winapi) DWORD {
    var buf: [8192]u8 align(4) = undefined;
    var overlapped = OVERLAPPED{ .hEvent = g_change_event };

    while (g_running) {
        // 非同期 I/O を発行（即座に返る）
        const ok = ReadDirectoryChangesW(
            g_dir_handle,
            &buf,
            @intCast(buf.len),
            BOOL.fromBool(false),
            NOTIFY_FILTER,
            null,
            &overlapped,
            null,
        );
        if (!ok.toBool()) break;

        // 変更イベント or 停止イベントを待つ
        const handles = [2]HANDLE{ g_change_event.?, g_stop_event.? };
        const result = WaitForMultipleObjects(2, &handles, BOOL.fromBool(false), INFINITE);

        if (result == WAIT_OBJECT_0) {
            // ディレクトリ変更
            var bytes: DWORD = 0;
            _ = GetOverlappedResult(g_dir_handle, &overlapped, &bytes, BOOL.fromBool(false));
            if (g_running) g_has_change = true;
            _ = ResetEvent(g_change_event.?);
        } else {
            // 停止シグナル (WAIT_OBJECT_0 + 1) またはエラー
            _ = CancelIo(g_dir_handle);
            var bytes: DWORD = 0;
            // キャンセル完了まで待ってからバッファを解放
            _ = GetOverlappedResult(g_dir_handle, &overlapped, &bytes, BOOL.fromBool(true));
            break;
        }
    }
    return 0;
}

// ── Exported functions ─────────────────────────────────────────────────────

/// Start watching a directory. Returns 0 on success, -1 on error.
export fn hue_watch_start(path_utf8: [*:0]const u8) i32 {
    hue_watch_stop();

    // 停止用イベント (manual-reset, 初期=非シグナル)
    const stop_ev = CreateEventW(null, BOOL.fromBool(true), BOOL.fromBool(false), null) orelse return -1;

    // 変更通知用イベント (manual-reset, 初期=非シグナル)
    const change_ev = CreateEventW(null, BOOL.fromBool(true), BOOL.fromBool(false), null) orelse {
        windows.CloseHandle(stop_ev);
        return -1;
    };

    var path_buf: [1024]u16 = undefined;
    const path_slice = std.mem.span(path_utf8);
    const len = std.unicode.utf8ToUtf16Le(&path_buf, path_slice) catch {
        windows.CloseHandle(stop_ev);
        windows.CloseHandle(change_ev);
        return -1;
    };
    if (len >= path_buf.len) {
        windows.CloseHandle(stop_ev);
        windows.CloseHandle(change_ev);
        return -1;
    }
    path_buf[len] = 0;

    // FILE_FLAG_OVERLAPPED でハンドルを開く
    const handle = CreateFileW(
        @ptrCast(&path_buf),
        FILE_LIST_DIRECTORY,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        null,
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED,
        null,
    );
    if (handle == INVALID_HANDLE_VALUE) {
        windows.CloseHandle(stop_ev);
        windows.CloseHandle(change_ev);
        return -1;
    }

    g_dir_handle = handle;
    g_stop_event = stop_ev;
    g_change_event = change_ev;
    g_has_change = false;
    g_running = true;

    g_thread = CreateThread(null, 0, watchThread, null, 0, null);
    if (g_thread == null) {
        windows.CloseHandle(handle);
        windows.CloseHandle(stop_ev);
        windows.CloseHandle(change_ev);
        g_dir_handle = INVALID_HANDLE_VALUE;
        g_stop_event = null;
        g_change_event = null;
        g_running = false;
        return -1;
    }
    return 0;
}

/// Stop watching. Safe to call even if not watching.
export fn hue_watch_stop() void {
    if (!g_running) return;
    g_running = false;
    // SetEvent で WaitForMultipleObjects を即時解除
    if (g_stop_event) |ev| _ = SetEvent(ev);
    // スレッドは CancelIo + GetOverlappedResult 後に即座に終了する
    if (g_thread) |t| {
        _ = WaitForSingleObject(t, 500);
        windows.CloseHandle(t);
        g_thread = null;
    }
    if (g_dir_handle != INVALID_HANDLE_VALUE) {
        windows.CloseHandle(g_dir_handle);
        g_dir_handle = INVALID_HANDLE_VALUE;
    }
    if (g_stop_event) |ev| {
        windows.CloseHandle(ev);
        g_stop_event = null;
    }
    if (g_change_event) |ev| {
        windows.CloseHandle(ev);
        g_change_event = null;
    }
}

/// Returns true if changes were detected since last call. Clears the flag.
export fn hue_watch_has_change() bool {
    const v = g_has_change;
    g_has_change = false;
    return v;
}
