package com.example.llmcouncil;

import java.util.List;

public record ReviewResult(CouncilMember reviewer, List<String> ranking, String rationale) {
}
