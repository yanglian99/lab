package com.example.nemoclaw;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

public final class SystemCommandRunner implements CommandRunner {
    @Override
    public int run(List<String> command, Path workingDirectory) throws IOException, InterruptedException {
        Process process = new ProcessBuilder(command)
                .directory(workingDirectory.toFile())
                .inheritIO()
                .start();
        return process.waitFor();
    }
}
