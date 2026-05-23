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
}
