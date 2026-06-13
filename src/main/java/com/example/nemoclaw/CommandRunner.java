package com.example.nemoclaw;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

@FunctionalInterface
public interface CommandRunner {
    int run(List<String> command, Path workingDirectory) throws IOException, InterruptedException;
}
