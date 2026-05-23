const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const fs_lib = b.addLibrary(.{
        .name = "hue_fs",
        .linkage = .dynamic,
        .root_module = b.createModule(.{
            .root_source_file = b.path("core/fs/src/fs.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    b.installArtifact(fs_lib);

    const watcher_lib = b.addLibrary(.{
        .name = "hue_watcher",
        .linkage = .dynamic,
        .root_module = b.createModule(.{
            .root_source_file = b.path("core/watcher/src/watcher.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    b.installArtifact(watcher_lib);

    const thumb_mod = b.createModule(.{
        .root_source_file = b.path("core/thumbnailer/src/thumbnailer.zig"),
        .target = target,
        .optimize = optimize,
    });

    const thumb_lib = b.addLibrary(.{
        .name = "hue_thumbnailer",
        .linkage = .dynamic,
        .root_module = thumb_mod,
    });

    thumb_mod.linkSystemLibrary("Gdi32", .{});
    thumb_mod.linkSystemLibrary("Shell32", .{});
    thumb_mod.linkSystemLibrary("Ole32", .{});

    b.installArtifact(thumb_lib);

    const preview_lib = b.addLibrary(.{
        .name = "hue_preview",
        .linkage = .dynamic,
        .root_module = b.createModule(.{
            .root_source_file = b.path("core/preview/src/preview.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    b.installArtifact(preview_lib);
}
