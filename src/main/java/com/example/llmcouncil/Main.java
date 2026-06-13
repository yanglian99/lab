package com.example.llmcouncil;

public class Main {
    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            System.err.println("Usage: mvn exec:java -Dexec.args=\"<your prompt>\"");
            System.exit(1);
        }

        String prompt = String.join(" ", args);
        CouncilConfig config = CouncilConfig.fromEnvironment();
        CouncilWorkflow workflow = new CouncilWorkflow(config, new OpenRouterClient(config));

        System.out.println("Running council for prompt:\n" + prompt + "\n");
        String finalAnswer = workflow.run(prompt);
        System.out.println("=== Final Chairman Response ===");
        System.out.println(finalAnswer);
    }
}
