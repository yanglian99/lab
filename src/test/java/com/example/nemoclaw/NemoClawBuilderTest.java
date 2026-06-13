package com.example.nemoclaw;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class NemoClawBuilderTest {
    @TempDir
    Path tempDir;

    @Test
    void validatesExpectedRepoShape() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> NemoClawBuilder.validateRepo(tempDir));
        assertTrue(error.getMessage().contains("does not look like a NemoClaw checkout"));
    }

    @Test
    void runsExpectedBuildCommandsInOrder() throws IOException, InterruptedException {
        Path repo = Files.createDirectory(tempDir.resolve("NemoClaw"));
        Files.writeString(repo.resolve("package.json"), "{}");
        Files.createDirectories(repo.resolve("nemoclaw"));
        Files.writeString(repo.resolve("nemoclaw/package.json"), "{}");

        List<List<String>> commands = new ArrayList<>();
        CommandRunner runner = (command, workingDirectory) -> {
            commands.add(List.copyOf(command));
            assertEquals(repo, workingDirectory);
            return 0;
        };

        new NemoClawBuilder(runner).build(repo);

        assertEquals(List.of(
                List.of("npm", "install"),
                List.of("npm", "run", "prepublishOnly")), commands);
    }

    @Test
    void surfacesCommandFailures() throws IOException {
        Path repo = Files.createDirectory(tempDir.resolve("NemoClaw"));
        Files.writeString(repo.resolve("package.json"), "{}");
        Files.createDirectories(repo.resolve("nemoclaw"));
        Files.writeString(repo.resolve("nemoclaw/package.json"), "{}");

        NemoClawBuilder builder = new NemoClawBuilder((command, workingDirectory) -> 9);

        IOException error = assertThrows(IOException.class, () -> builder.build(repo));
        assertTrue(error.getMessage().contains("exit code 9"));
    }
}
