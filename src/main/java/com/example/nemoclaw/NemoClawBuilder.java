package com.example.nemoclaw;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public final class NemoClawBuilder {
    private final CommandRunner commandRunner;

    public NemoClawBuilder(CommandRunner commandRunner) {
        this.commandRunner = commandRunner;
    }

    public void build(Path repoRoot) throws IOException, InterruptedException {
        validateRepo(repoRoot);
        runOrThrow(List.of("npm", "install"), repoRoot);
        runOrThrow(List.of("npm", "run", "prepublishOnly"), repoRoot);
    }

    static void validateRepo(Path repoRoot) throws IOException {
        if (repoRoot == null) {
            throw new IllegalArgumentException("Repository path is required.");
        }
        if (!Files.isDirectory(repoRoot)) {
            throw new IllegalArgumentException("Repository path does not exist: " + repoRoot);
        }

        Path packageJson = repoRoot.resolve("package.json");
        Path nestedPackageJson = repoRoot.resolve("nemoclaw").resolve("package.json");
        if (!Files.isRegularFile(packageJson) || !Files.isRegularFile(nestedPackageJson)) {
            throw new IllegalArgumentException(
                    "Path does not look like a NemoClaw checkout. Expected package.json and nemoclaw/package.json under: "
                            + repoRoot);
        }
    }

    private void runOrThrow(List<String> command, Path repoRoot) throws IOException, InterruptedException {
        int exitCode = commandRunner.run(command, repoRoot);
        if (exitCode != 0) {
            throw new IOException("Command failed with exit code " + exitCode + ": " + String.join(" ", command));
        }
    }
}
