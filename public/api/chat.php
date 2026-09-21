<?php
/**
 * MesonX AI — LLM API Gateway proxy
 *
 * Same-origin relay (GoDaddy PHP) to the MesonX AWS LLM gateway. This avoids
 * browser CORS and keeps any future auth token server-side. The gateway's
 * response is relayed to the browser as Server-Sent Events so the MesonX AI
 * chat widget can render tokens in real time.
 *
 * Ported from the sQuark Cloud AI proxy (sQuark.ai/public/api/chat.php) so
 * both sites share the exact same backend contract.
 *
 * Gateway contract (POST {GATEWAY_URL}):
 *   { "prompt": str, "user_id": str, "provider": gemini|openrouter|bedrock,
 *     "model": str|"", "mode": text|code|image, "stream": true }
 * Response: SSE frames `data: {"token": "..."}` ending with `data: [DONE]`,
 * or a JSON object `{"text": "..."}` / `{"image_url": "..."}` / `{"error": "..."}`
 * when streaming is not available on the integration.
 */

declare(strict_types=1);

// ---- Configuration ----
$GATEWAY_URL = 'https://tobm8g2xwh.execute-api.us-east-2.amazonaws.com/prod/llm/chat';
// Optional bearer token if the gateway later enforces Cognito auth.
// Set via environment (putenv) or leave empty for the open endpoint.
$GATEWAY_BEARER = (string) (getenv('MESON_LLM_BEARER') ?: '');

// CORS — same-origin on GoDaddy, but kept permissive for safety.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$raw = (string) file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

$prompt = trim((string) ($input['prompt'] ?? ''));
if ($prompt === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing prompt']);
    exit;
}
// Cap prompt size to limit abuse / payload cost.
if (mb_strlen($prompt) > 8000) {
    $prompt = mb_substr($prompt, -8000);
}

// Stable anonymous visitor id so the gateway can apply per-user quotas.
$visitorId = $_COOKIE['meson_vid'] ?? '';
if ($visitorId === '' || !preg_match('/^[\w-]{8,64}$/', $visitorId)) {
    $visitorId = 'web-' . bin2hex(random_bytes(8)) . '-' . base_convert(time(), 10, 36);
    setcookie('meson_vid', $visitorId, [
        'expires'  => time() + 60 * 60 * 24 * 365,
        'path'     => '/',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

$userId = is_string($input['user_id'] ?? '') ? $input['user_id'] : $visitorId;
if (!preg_match('/^[\w-]{1,64}$/', $userId)) {
    $userId = $visitorId;
}
$provider = in_array($input['provider'] ?? '', ['gemini', 'openrouter', 'bedrock'], true)
    ? $input['provider'] : 'gemini';
$model = is_string($input['model'] ?? '') ? $input['model'] : '';
// Forward the widget mode so image generation keeps working through the proxy.
$mode = in_array($input['mode'] ?? '', ['text', 'code', 'image'], true)
    ? $input['mode'] : 'text';

$payload = json_encode([
    'prompt'  => $prompt,
    'user_id' => $userId,
    'provider' => $provider,
    'model'   => $model,
    'mode'    => $mode,
    'stream'  => true,
]);

// ---- Streaming SSE response to the browser ----
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // disable LiteSpeed / proxy buffering
@ini_set('output_buffering', '0');
@ini_set('zlib.output_compression', '0');
while (ob_get_level() > 0) {
    ob_end_flush();
}
ob_implicit_flush(1);

$sse = static function (array $data): void {
    echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
    @ob_flush();
    flush();
};

// Relay the gateway response. If it streams SSE we forward verbatim (real
// time); if it returns a JSON object we re-emit it token-by-token so the
// browser still gets a smooth typing effect.
$streamMode = null;   // 'sse' | 'json'
$buffer = '';
$ch = curl_init($GATEWAY_URL);
$headers = ['Content-Type: application/json'];
if ($GATEWAY_BEARER !== '') {
    $headers[] = 'Authorization: Bearer ' . $GATEWAY_BEARER;
}
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_WRITEFUNCTION  => static function ($ch, $chunk) use (&$streamMode, &$buffer) {
        $trimmed = ltrim($chunk);
        if ($streamMode === null) {
            if (str_starts_with($trimmed, 'data:') || str_starts_with($trimmed, 'HTTP/')) {
                $streamMode = 'sse';
            } elseif (str_starts_with($trimmed, '{')) {
                $streamMode = 'json';
                $buffer = $chunk;
                return strlen($chunk);
            } else {
                $streamMode = 'sse';
            }
        }
        if ($streamMode === 'json') {
            $buffer .= $chunk;
            return strlen($chunk);
        }
        echo $chunk; // relay SSE verbatim
        @ob_flush();
        flush();
        return strlen($chunk);
    },
]);

$ok = curl_exec($ch);
$errno = curl_errno($ch);
curl_close($ch);

if ($ok === false || $errno !== 0) {
    $sse(['error' => 'MesonX AI is temporarily unreachable. Please try again in a moment.', 'proxy_unavailable' => true]);
    echo "data: [DONE]\n\n";
    @ob_flush();
    flush();
    exit;
}

if ($streamMode === 'json') {
    $data = json_decode($buffer, true);
    // Image-generation responses carry an image_url (HunyuanImage expert).
    if (is_array($data) && !empty($data['image_url'])) {
        $sse([
            'image_url' => (string) $data['image_url'],
            'text'      => (string) ($data['text'] ?? 'Generated image'),
        ]);
    } else {
        $text = is_array($data) ? (string) ($data['text'] ?? $data['error'] ?? '') : '';
        if ($text === '') {
            $text = 'MesonX AI returned an empty response. Please try again.';
        }
        $tokens = preg_split('/(?<=\s)/u', $text) ?: [$text];
        foreach ($tokens as $tok) {
            $sse(['token' => $tok]);
            usleep(8000);
        }
    }
}

echo "data: [DONE]\n\n";
@ob_flush();
flush();

