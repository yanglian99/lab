import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;

public class MicroGpt {
    private static final Random RANDOM = new Random(42);
    private static final String INPUT_FILE = "input.txt";
    private static final String NAMES_URL = "https://raw.githubusercontent.com/karpathy/makemore/988aa59/names.txt";
    private static final String FALLBACK_INPUT = String.join("\n",
            "emma", "olivia", "ava", "isabella", "sophia", "mia", "charlotte", "amelia",
            "harper", "evelyn", "liam", "noah", "oliver", "elijah", "james", "william",
            "benjamin", "lucas", "henry", "theodore") + "\n";

    private static final int N_LAYER = 1;
    private static final int N_EMBD = 16;
    private static final int BLOCK_SIZE = 16;
    private static final int N_HEAD = 4;
    private static final int HEAD_DIM = N_EMBD / N_HEAD;

    private static final double LEARNING_RATE = 0.01;
    private static final double BETA1 = 0.85;
    private static final double BETA2 = 0.99;
    private static final double EPS_ADAM = 1e-8;
    private static final int NUM_STEPS = 1000;
    private static final double TEMPERATURE = 0.5;
    private static final int NUM_SAMPLES = 20;

    private static final Map<String, Value[][]> STATE_DICT = new HashMap<>();
    private static final List<Value> PARAMS = new ArrayList<>();

    private static List<String> docs;
    private static List<Character> uchars;
    private static Map<Character, Integer> stoi;
    private static int bos;
    private static int vocabSize;

    public static void main(String[] args) throws Exception {
        ensureInputFile();
        docs = loadDocs();
        Collections.shuffle(docs, RANDOM);
        System.out.println("num docs: " + docs.size());

        buildTokenizer();
        System.out.println("vocab size: " + vocabSize);

        initializeParameters();
        System.out.println("num params: " + PARAMS.size());

        train();
        inference();
    }

    private static void ensureInputFile() throws IOException, InterruptedException {
        Path path = Path.of(INPUT_FILE);
        if (Files.exists(path)) {
            return;
        }
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder(URI.create(NAMES_URL)).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            Files.writeString(path, response.body());
        } catch (IOException | InterruptedException ex) {
            Files.writeString(path, FALLBACK_INPUT);
        }
    }

    private static List<String> loadDocs() throws IOException {
        List<String> loaded = new ArrayList<>();
        for (String line : Files.readAllLines(Path.of(INPUT_FILE))) {
            String stripped = line.trim();
            if (!stripped.isEmpty()) {
                loaded.add(stripped);
            }
        }
        return loaded;
    }

    private static void buildTokenizer() {
        Set<Character> unique = new LinkedHashSet<>();
        for (String doc : docs) {
            for (char ch : doc.toCharArray()) {
                unique.add(ch);
            }
        }
        uchars = new ArrayList<>(unique);
        uchars.sort(Character::compareTo);
        stoi = new HashMap<>();
        for (int i = 0; i < uchars.size(); i++) {
            stoi.put(uchars.get(i), i);
        }
        bos = uchars.size();
        vocabSize = uchars.size() + 1;
    }

    private static void initializeParameters() {
        STATE_DICT.put("wte", matrix(vocabSize, N_EMBD, 0.08));
        STATE_DICT.put("wpe", matrix(BLOCK_SIZE, N_EMBD, 0.08));
        STATE_DICT.put("lm_head", matrix(vocabSize, N_EMBD, 0.08));
        for (int i = 0; i < N_LAYER; i++) {
            STATE_DICT.put("layer" + i + ".attn_wq", matrix(N_EMBD, N_EMBD, 0.08));
            STATE_DICT.put("layer" + i + ".attn_wk", matrix(N_EMBD, N_EMBD, 0.08));
            STATE_DICT.put("layer" + i + ".attn_wv", matrix(N_EMBD, N_EMBD, 0.08));
            STATE_DICT.put("layer" + i + ".attn_wo", matrix(N_EMBD, N_EMBD, 0.08));
            STATE_DICT.put("layer" + i + ".mlp_fc1", matrix(4 * N_EMBD, N_EMBD, 0.08));
            STATE_DICT.put("layer" + i + ".mlp_fc2", matrix(N_EMBD, 4 * N_EMBD, 0.08));
        }
        for (Value[][] matrix : STATE_DICT.values()) {
            for (Value[] row : matrix) {
                Collections.addAll(PARAMS, row);
            }
        }
    }

    private static Value[][] matrix(int nout, int nin, double std) {
        Value[][] out = new Value[nout][nin];
        for (int i = 0; i < nout; i++) {
            for (int j = 0; j < nin; j++) {
                out[i][j] = new Value(RANDOM.nextGaussian() * std);
            }
        }
        return out;
    }

    private static void train() {
        double[] m = new double[PARAMS.size()];
        double[] v = new double[PARAMS.size()];

        for (int step = 0; step < NUM_STEPS; step++) {
            String doc = docs.get(step % docs.size());
            List<Integer> tokens = new ArrayList<>();
            tokens.add(bos);
            for (char ch : doc.toCharArray()) {
                tokens.add(stoi.get(ch));
            }
            tokens.add(bos);

            int n = Math.min(BLOCK_SIZE, tokens.size() - 1);
            List<List<List<Value>>> keys = new ArrayList<>();
            List<List<List<Value>>> values = new ArrayList<>();
            for (int i = 0; i < N_LAYER; i++) {
                keys.add(new ArrayList<>());
                values.add(new ArrayList<>());
            }

            List<Value> losses = new ArrayList<>();
            Value loss = null;
            for (int posId = 0; posId < n; posId++) {
                int tokenId = tokens.get(posId);
                int targetId = tokens.get(posId + 1);
                List<Value> logits = gpt(tokenId, posId, keys, values);
                List<Value> probs = softmax(logits);
                Value lossT = probs.get(targetId).log().neg();
                losses.add(lossT);
                loss = sum(losses).mul(1.0 / n);
            }

            if (loss == null) {
                continue;
            }
            loss.backward();

            double lrT = LEARNING_RATE * (1.0 - ((double) step / NUM_STEPS));
            for (int i = 0; i < PARAMS.size(); i++) {
                Value p = PARAMS.get(i);
                m[i] = BETA1 * m[i] + (1 - BETA1) * p.grad;
                v[i] = BETA2 * v[i] + (1 - BETA2) * p.grad * p.grad;
                double mHat = m[i] / (1 - Math.pow(BETA1, step + 1));
                double vHat = v[i] / (1 - Math.pow(BETA2, step + 1));
                p.data -= lrT * mHat / (Math.sqrt(vHat) + EPS_ADAM);
                p.grad = 0.0;
            }

            System.out.print(String.format(Locale.US, "step %4d / %4d | loss %.4f\r", step + 1, NUM_STEPS, loss.data));
        }
    }

    private static void inference() {
        System.out.println("\n--- inference (new, hallucinated names) ---");
        for (int sampleIdx = 0; sampleIdx < NUM_SAMPLES; sampleIdx++) {
            List<List<List<Value>>> keys = new ArrayList<>();
            List<List<List<Value>>> values = new ArrayList<>();
            for (int i = 0; i < N_LAYER; i++) {
                keys.add(new ArrayList<>());
                values.add(new ArrayList<>());
            }

            int tokenId = bos;
            StringBuilder sample = new StringBuilder();
            for (int posId = 0; posId < BLOCK_SIZE; posId++) {
                List<Value> logits = gpt(tokenId, posId, keys, values);
                List<Value> scaled = new ArrayList<>();
                for (Value logit : logits) {
                    scaled.add(logit.div(TEMPERATURE));
                }
                List<Value> probs = softmax(scaled);
                tokenId = sampleToken(probs);
                if (tokenId == bos) {
                    break;
                }
                sample.append(uchars.get(tokenId));
            }
            System.out.println(String.format("sample %2d: %s", sampleIdx + 1, sample));
        }
    }

    private static int sampleToken(List<Value> probs) {
        double threshold = RANDOM.nextDouble();
        double cumulative = 0.0;
        for (int i = 0; i < probs.size(); i++) {
            cumulative += probs.get(i).data;
            if (threshold <= cumulative) {
                return i;
            }
        }
        return probs.size() - 1;
    }

    private static List<Value> gpt(int tokenId, int posId, List<List<List<Value>>> keys, List<List<List<Value>>> values) {
        List<Value> tokEmb = rowToList(STATE_DICT.get("wte")[tokenId]);
        List<Value> posEmb = rowToList(STATE_DICT.get("wpe")[posId]);
        List<Value> x = new ArrayList<>();
        for (int i = 0; i < tokEmb.size(); i++) {
            x.add(tokEmb.get(i).add(posEmb.get(i)));
        }
        x = rmsnorm(x);

        for (int li = 0; li < N_LAYER; li++) {
            List<Value> xResidual = x;
            x = rmsnorm(x);
            List<Value> q = linear(x, STATE_DICT.get("layer" + li + ".attn_wq"));
            List<Value> k = linear(x, STATE_DICT.get("layer" + li + ".attn_wk"));
            List<Value> vv = linear(x, STATE_DICT.get("layer" + li + ".attn_wv"));
            keys.get(li).add(k);
            values.get(li).add(vv);

            List<Value> xAttn = new ArrayList<>();
            for (int h = 0; h < N_HEAD; h++) {
                int hs = h * HEAD_DIM;
                List<Value> qh = slice(q, hs, hs + HEAD_DIM);
                List<List<Value>> kh = new ArrayList<>();
                List<List<Value>> vh = new ArrayList<>();
                for (List<Value> key : keys.get(li)) {
                    kh.add(slice(key, hs, hs + HEAD_DIM));
                }
                for (List<Value> value : values.get(li)) {
                    vh.add(slice(value, hs, hs + HEAD_DIM));
                }

                List<Value> attnLogits = new ArrayList<>();
                for (List<Value> key : kh) {
                    Value dot = new Value(0.0);
                    for (int j = 0; j < HEAD_DIM; j++) {
                        dot = dot.add(qh.get(j).mul(key.get(j)));
                    }
                    attnLogits.add(dot.div(Math.sqrt(HEAD_DIM)));
                }
                List<Value> attnWeights = softmax(attnLogits);
                for (int j = 0; j < HEAD_DIM; j++) {
                    Value headOut = new Value(0.0);
                    for (int t = 0; t < vh.size(); t++) {
                        headOut = headOut.add(attnWeights.get(t).mul(vh.get(t).get(j)));
                    }
                    xAttn.add(headOut);
                }
            }

            x = linear(xAttn, STATE_DICT.get("layer" + li + ".attn_wo"));
            x = addVectors(x, xResidual);

            xResidual = x;
            x = rmsnorm(x);
            x = linear(x, STATE_DICT.get("layer" + li + ".mlp_fc1"));
            List<Value> reluX = new ArrayList<>();
            for (Value value : x) {
                reluX.add(value.relu());
            }
            x = linear(reluX, STATE_DICT.get("layer" + li + ".mlp_fc2"));
            x = addVectors(x, xResidual);
        }

        return linear(x, STATE_DICT.get("lm_head"));
    }

    private static List<Value> linear(List<Value> x, Value[][] w) {
        List<Value> out = new ArrayList<>();
        for (Value[] row : w) {
            Value sum = new Value(0.0);
            for (int i = 0; i < row.length; i++) {
                sum = sum.add(row[i].mul(x.get(i)));
            }
            out.add(sum);
        }
        return out;
    }

    private static List<Value> softmax(List<Value> logits) {
        double maxVal = Double.NEGATIVE_INFINITY;
        for (Value logit : logits) {
            maxVal = Math.max(maxVal, logit.data);
        }
        List<Value> exps = new ArrayList<>();
        for (Value logit : logits) {
            exps.add(logit.sub(maxVal).exp());
        }
        Value total = sum(exps);
        List<Value> probs = new ArrayList<>();
        for (Value exp : exps) {
            probs.add(exp.div(total));
        }
        return probs;
    }

    private static List<Value> rmsnorm(List<Value> x) {
        Value ms = new Value(0.0);
        for (Value xi : x) {
            ms = ms.add(xi.mul(xi));
        }
        ms = ms.div(x.size());
        Value scale = ms.add(1e-5).pow(-0.5);
        List<Value> out = new ArrayList<>();
        for (Value xi : x) {
            out.add(xi.mul(scale));
        }
        return out;
    }

    private static List<Value> addVectors(List<Value> a, List<Value> b) {
        List<Value> out = new ArrayList<>();
        for (int i = 0; i < a.size(); i++) {
            out.add(a.get(i).add(b.get(i)));
        }
        return out;
    }

    private static List<Value> slice(List<Value> values, int start, int end) {
        return new ArrayList<>(values.subList(start, end));
    }

    private static List<Value> rowToList(Value[] row) {
        List<Value> list = new ArrayList<>(row.length);
        Collections.addAll(list, row);
        return list;
    }

    private static Value sum(List<Value> values) {
        Value total = new Value(0.0);
        for (Value value : values) {
            total = total.add(value);
        }
        return total;
    }

    private static final class Value {
        double data;
        double grad;
        List<Value> children;
        List<Double> localGrads;

        Value(double data) {
            this(data, List.of(), List.of());
        }

        Value(double data, List<Value> children, List<Double> localGrads) {
            this.data = data;
            this.grad = 0.0;
            this.children = children;
            this.localGrads = localGrads;
        }

        Value add(Value other) {
            return new Value(this.data + other.data, List.of(this, other), List.of(1.0, 1.0));
        }

        Value add(double other) {
            return add(new Value(other));
        }

        Value sub(Value other) {
            return add(other.neg());
        }

        Value sub(double other) {
            return sub(new Value(other));
        }

        Value mul(Value other) {
            return new Value(this.data * other.data, List.of(this, other), List.of(other.data, this.data));
        }

        Value mul(double other) {
            return mul(new Value(other));
        }

        Value div(Value other) {
            return mul(other.pow(-1.0));
        }

        Value div(double other) {
            return div(new Value(other));
        }

        Value pow(double exponent) {
            return new Value(Math.pow(this.data, exponent), List.of(this), List.of(exponent * Math.pow(this.data, exponent - 1.0)));
        }

        Value log() {
            return new Value(Math.log(this.data), List.of(this), List.of(1.0 / this.data));
        }

        Value exp() {
            double out = Math.exp(this.data);
            return new Value(out, List.of(this), List.of(out));
        }

        Value relu() {
            return new Value(Math.max(0.0, this.data), List.of(this), List.of(this.data > 0.0 ? 1.0 : 0.0));
        }

        Value neg() {
            return mul(-1.0);
        }

        void backward() {
            List<Value> topo = new ArrayList<>();
            Set<Value> visited = new HashSet<>();
            buildTopo(this, visited, topo);
            this.grad = 1.0;
            for (int i = topo.size() - 1; i >= 0; i--) {
                Value value = topo.get(i);
                for (int j = 0; j < value.children.size(); j++) {
                    Value child = value.children.get(j);
                    double localGrad = value.localGrads.get(j);
                    child.grad += localGrad * value.grad;
                }
            }
        }

        private static void buildTopo(Value value, Set<Value> visited, List<Value> topo) {
            if (visited.contains(value)) {
                return;
            }
            visited.add(value);
            for (Value child : value.children) {
                buildTopo(child, visited, topo);
            }
            topo.add(value);
        }
    }
}
