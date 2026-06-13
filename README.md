# NemoClaw Java Builder

This repository now provides a small Java CLI that automates the documented local build steps for the upstream [`NVIDIA/NemoClaw`](https://github.com/NVIDIA/NemoClaw) project.

## What it does

The upstream NemoClaw project is currently distributed as a Node/TypeScript application. Based on its published `package.json`, the build flow is:

1. `npm install`
2. `npm run prepublishOnly`

This Java tool validates that a local checkout looks like the upstream repository and then runs those commands for you.

## Build this Java project

```bash
mvn package
```

## Run it

```bash
java -jar target/nemoclaw-java-builder-1.0.0-SNAPSHOT.jar /path/to/NemoClaw
```

## Expected upstream checkout structure

The provided path must contain:

- `package.json`
- `nemoclaw/package.json`

If either file is missing, the CLI exits with a validation error instead of running commands in the wrong directory.
