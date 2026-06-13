package com.example.nemoclaw;

import java.io.IOException;
import java.nio.file.Path;

public final class NemoClawBuildCli {
    private NemoClawBuildCli() {
    }

    public static void main(String[] args) {
        if (args.length != 1 || "--help".equals(args[0]) || "-h".equals(args[0])) {
            printUsage();
            System.exit(args.length == 1 ? 0 : 1);
        }

        Path repoRoot = Path.of(args[0]).toAbsolutePath().normalize();
        NemoClawBuilder builder = new NemoClawBuilder(new SystemCommandRunner());

        try {
            System.out.println("Building NemoClaw from: " + repoRoot);
            builder.build(repoRoot);
            System.out.println("Build completed successfully.");
        } catch (IllegalArgumentException e) {
            System.err.println("Invalid input: " + e.getMessage());
            System.exit(2);
        } catch (IOException | InterruptedException e) {
            System.err.println("Build failed: " + e.getMessage());
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            System.exit(3);
        }
    }

    private static void printUsage() {
        System.out.println("Usage: java -jar target/nemoclaw-java-builder-1.0.0-SNAPSHOT.jar <path-to-NemoClaw-checkout>");
        System.out.println("Runs 'npm install' and 'npm run prepublishOnly' in a local NVIDIA/NemoClaw checkout.");
    }
}
