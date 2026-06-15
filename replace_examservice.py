import os

file_path = 'src/main/java/com/lmscrm/backend/service/exam/ExamService.java'
if not os.path.exists(file_path):
    file_path = 'java-backend/' + file_path

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Jackson import if not exists
if "import com.fasterxml.jackson.databind.ObjectMapper;" not in content:
    content = content.replace("import lombok.RequiredArgsConstructor;", "import com.fasterxml.jackson.databind.ObjectMapper;\nimport lombok.RequiredArgsConstructor;")

if "import com.fasterxml.jackson.databind.JsonNode;" not in content:
    content = content.replace("import com.fasterxml.jackson.databind.ObjectMapper;", "import com.fasterxml.jackson.databind.JsonNode;\nimport com.fasterxml.jackson.databind.ObjectMapper;")

if "import com.lmscrm.backend.service.GeminiService;" not in content:
    content = content.replace("import com.lmscrm.backend.mapper.ExamMapper;", "import com.lmscrm.backend.mapper.ExamMapper;\nimport com.lmscrm.backend.service.GeminiService;")


# 2. Add dependencies
dep_marker = "    private final ExamMapper mapper;"
new_deps = """    private final ExamMapper mapper;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;"""
if dep_marker in content and "GeminiService geminiService" not in content:
    content = content.replace(dep_marker, new_deps)

# 3. Modify submitExam
start_submit = "    public ExamResultDto submitExam(ExamSubmitRequest request, User user) {"
end_submit = "        return ExamResultDto.builder()"

if start_submit in content and end_submit in content:
    idx_start = content.find(start_submit)
    idx_end = content.find(end_submit, idx_start)
    
    prefix = content[:idx_start]
    suffix = content[idx_end:]
    
    new_submit = """    public ExamResultDto submitExam(ExamSubmitRequest request, User user) {
        Exam exam = examRepository.findById(request.getExam_id())
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + request.getExam_id()));

        List<Question> questions = questionRepository.findByExamIdOrderByPositionOrderAsc(exam.getId());
        List<ExamResultDto.QuestionDetail> details = new ArrayList<>();
        int correctCount = 0;
        
        long totalTimeSpent = 0;
        if (request.getTime_spent() != null) {
            totalTimeSpent = request.getTime_spent().values().stream().mapToLong(Long::longValue).sum();
        }

        for (Question q : questions) {
            String userAns = request.getAnswers().get(q.getId().toString());
            Long timeSpent = request.getTime_spent() != null ? request.getTime_spent().getOrDefault(q.getId().toString(), 0L) : 0L;
            
            // Get correct answer from options
            List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());
            String correctAns = options.stream()
                    .filter(QuestionOption::getIsCorrect)
                    .map(QuestionOption::getText)
                    .findFirst()
                    .orElse("");

            boolean ok = IeltsGradingUtils.checkAnswer(userAns, correctAns);
            if (ok) correctCount += q.getPoints();

            details.add(ExamResultDto.QuestionDetail.builder()
                    .questionId(q.getId().toString())
                    .userAns(userAns != null ? userAns : "")
                    .correctAns(correctAns)
                    .ok(ok)
                    .timeSpentSeconds(timeSpent.intValue())
                    .build());
        }

        String kind = exam.getType().name().toLowerCase();
        double band = IeltsGradingUtils.rawToBand(kind, correctCount, questions.size());
        
        String aiCoachFeedback = null;
        String predictedScore = null;
        JsonNode explanationsNode = null;
        
        try {
            // Build JSON for Gemini
            java.util.Map<String, Object> examDataMap = new java.util.HashMap<>();
            examDataMap.put("examTitle", exam.getTitle());
            examDataMap.put("examType", kind);
            List<java.util.Map<String, Object>> qDataList = new java.util.ArrayList<>();
            for(ExamResultDto.QuestionDetail d : details) {
                java.util.Map<String, Object> qm = new java.util.HashMap<>();
                qm.put("questionId", d.getQuestionId());
                Question qEntity = questions.stream().filter(x -> x.getId().toString().equals(d.getQuestionId())).findFirst().orElse(null);
                qm.put("prompt", qEntity != null ? qEntity.getText() : "");
                qm.put("userAnswer", d.getUserAns());
                qm.put("correctAnswer", d.getCorrectAns());
                qm.put("isCorrect", d.isOk());
                qDataList.add(qm);
            }
            examDataMap.put("questions", qDataList);
            
            String examDataJson = objectMapper.writeValueAsString(examDataMap);
            String reviewResult = geminiService.generateExamReview(examDataJson);
            
            if (reviewResult != null) {
                JsonNode root = objectMapper.readTree(reviewResult);
                if (root.has("coachFeedback")) {
                    aiCoachFeedback = objectMapper.writeValueAsString(root.get("coachFeedback"));
                }
                if (root.has("predictedScore")) {
                    predictedScore = root.get("predictedScore").asText();
                }
                if (root.has("explanations")) {
                    explanationsNode = root.get("explanations");
                    // populate details with explanations
                    for (ExamResultDto.QuestionDetail d : details) {
                        if (explanationsNode.has(d.getQuestionId())) {
                            d.setAiExplanation(explanationsNode.get(d.getQuestionId()).asText());
                        }
                    }
                }
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(ExamService.class).error("Failed to generate AI review: ", e);
        }

        if (user != null) {
            java.util.Optional<StudentAttempt> attemptOpt = studentAttemptRepository.findByExamIdAndStudentId(exam.getId(), user.getId());
            StudentAttempt attempt;
            if (attemptOpt.isPresent()) {
                attempt = attemptOpt.get();
                studentAnswerRepository.deleteByAttemptId(attempt.getId());
            } else {
                attempt = new StudentAttempt();
                attempt.setExam(exam);
                attempt.setStudent(user);
            }
            attempt.setStartedAt(java.time.LocalDateTime.now().minusMinutes(exam.getDurationMinutes() != null ? exam.getDurationMinutes() : 60));
            attempt.setFinishedAt(java.time.LocalDateTime.now());
            attempt.setTotalScore(correctCount);
            attempt.setMaxScore(questions.size());
            attempt.setIsPassed(correctCount >= exam.getPassingScore());
            attempt.setOverallBand(band);
            attempt.setTimeUsedSeconds((int) totalTimeSpent);
            attempt.setAiCoachFeedback(aiCoachFeedback);
            attempt.setPredictedScore(predictedScore);
            attempt = studentAttemptRepository.save(attempt);

            for (Question q : questions) {
                String userAns = request.getAnswers().get(q.getId().toString());
                List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());
                Long timeSpent = request.getTime_spent() != null ? request.getTime_spent().getOrDefault(q.getId().toString(), 0L) : 0L;
                String aiExpl = explanationsNode != null && explanationsNode.has(q.getId().toString()) ? explanationsNode.get(q.getId().toString()).asText() : null;
                
                QuestionOption selectedOption = null;
                if (userAns != null && !userAns.trim().isEmpty()) {
                    selectedOption = options.stream()
                            .filter(o -> o.getText().equalsIgnoreCase(userAns.trim()))
                            .findFirst()
                            .orElse(null);
                }

                String correctAns = options.stream()
                        .filter(QuestionOption::getIsCorrect)
                        .map(QuestionOption::getText)
                        .findFirst()
                        .orElse("");
                boolean isCorrect = IeltsGradingUtils.checkAnswer(userAns, correctAns);

                StudentAnswer answer = StudentAnswer.builder()
                        .attempt(attempt)
                        .question(q)
                        .selectedOption(selectedOption)
                        .userAnswerText(userAns)
                        .isCorrect(isCorrect)
                        .pointsEarned(isCorrect ? q.getPoints() : 0)
                        .timeSpentSeconds(timeSpent.intValue())
                        .aiExplanation(aiExpl)
                        .build();
                studentAnswerRepository.save(answer);
            }
        }

"""
    content = prefix + new_submit + suffix
    
    # 4. We also need to update `getExamResult` to return the new fields
    start_get = "    public ExamResultDto getExamResult(UUID examId, User student) {"
    end_get = "        return ExamResultDto.builder()"
    
    if start_get in content and end_get in content:
        idx_g_start = content.find(start_get)
        idx_g_end = content.find(end_get, idx_g_start)
        
        pref2 = content[:idx_g_start]
        suff2 = content[idx_g_end:]
        
        new_get = """    public ExamResultDto getExamResult(UUID examId, User student) {
        StudentAttempt attempt = studentAttemptRepository.findByExamIdAndStudentId(examId, student.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No attempt found for this exam"));

        List<Question> questions = questionRepository.findByExamIdOrderByPositionOrderAsc(examId);
        List<StudentAnswer> answers = studentAnswerRepository.findByAttemptId(attempt.getId());
        java.util.Map<UUID, StudentAnswer> answerMap = answers.stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a));

        List<ExamResultDto.QuestionDetail> details = new ArrayList<>();
        int correctCount = 0;

        for (Question q : questions) {
            StudentAnswer answer = answerMap.get(q.getId());
            String userAns = "";
            boolean ok = false;
            Integer timeSpent = 0;
            String aiExpl = null;
            if (answer != null) {
                userAns = answer.getUserAnswerText() != null ? answer.getUserAnswerText() : (answer.getSelectedOption() != null ? answer.getSelectedOption().getText() : "");
                ok = answer.getIsCorrect() != null && answer.getIsCorrect();
                correctCount += (answer.getPointsEarned() != null) ? answer.getPointsEarned() : 0;
                timeSpent = answer.getTimeSpentSeconds() != null ? answer.getTimeSpentSeconds() : 0;
                aiExpl = answer.getAiExplanation();
            }

            List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());
            String correctAns = options.stream()
                    .filter(QuestionOption::getIsCorrect)
                    .map(QuestionOption::getText)
                    .findFirst()
                    .orElse("");

            details.add(ExamResultDto.QuestionDetail.builder()
                    .questionId(q.getId().toString())
                    .userAns(userAns)
                    .correctAns(correctAns)
                    .ok(ok)
                    .timeSpentSeconds(timeSpent)
                    .aiExplanation(aiExpl)
                    .build());
        }

        String kind = attempt.getExam().getType().name().toLowerCase();
        
"""
        content = pref2 + new_get + suff2

        # 5. Add new fields to ExamResultDto builder blocks!
        # submitExam return builder
        content = content.replace("                .bandScore(band)\n                .detail(details)\n                .build();", "                .bandScore(band)\n                .detail(details)\n                .timeUsedSeconds((int)totalTimeSpent)\n                .aiCoachFeedback(aiCoachFeedback)\n                .predictedScore(predictedScore)\n                .build();", 1)
        
        # getExamResult return builder
        content = content.replace("                .bandScore(attempt.getOverallBand() != null ? attempt.getOverallBand() : 0.0)\n                .detail(details)\n                .build();", "                .bandScore(attempt.getOverallBand() != null ? attempt.getOverallBand() : 0.0)\n                .detail(details)\n                .timeUsedSeconds(attempt.getTimeUsedSeconds() != null ? attempt.getTimeUsedSeconds() : 0)\n                .aiCoachFeedback(attempt.getAiCoachFeedback())\n                .predictedScore(attempt.getPredictedScore())\n                .build();")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated ExamService")
    else:
        print("getExamResult start/end not found")
else:
    print("submitExam start/end not found")

