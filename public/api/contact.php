<?php
/**
 * Mesonsoft — Contact form endpoint
 *
 * Receives the Contact page form (src/partials/contact.html, "Contact With
 * Us" widget) and emails the submission to the site owner. Runs as plain PHP
 * next to the static Next.js export on the GoDaddy host, following the same
 * conventions as /api/chat.php.
 *
 * Request (POST application/x-www-form-urlencoded):
 *   text-909     required  <=400   visitor name
 *   email-939    required  <=400   visitor email (validated)
 *   textarea-561 required  <=2000  the message
 *   ms_website   honeypot — must stay empty (fake success when filled)
 *   ms_ajax      "1" when submitted by /assets/ms-contact-form.js
 *
 * Response:
 *   AJAX  → JSON {ok:bool, message:string, errors?:{name:msg}} (200/422/405)
 *   no-JS → 302 redirect to /contact/?ms_status=sent|error#wpcf7-f288-p422-o1
 */

declare(strict_types=1);

const MS_TO_EMAIL = 'shiva.dhanuskodi@mesonsoft.com';

/** Emit a JSON response and stop. */
function ms_json(int $code, array $payload): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Redirect back to the Contact page with a status flag (no-JS fallback). */
function ms_redirect(string $status): void
{
    header('Location: /contact/?ms_status=' . rawurlencode($status) . '#wpcf7-f288-p422-o1', true, 302);
    exit;
}

/** Fail either as JSON (AJAX) or as a redirect (no JS). */
function ms_fail(bool $isAjax, string $message, array $errors = []): void
{
    if ($isAjax) {
        ms_json(422, ['ok' => false, 'message' => $message, 'errors' => $errors]);
    }
    ms_redirect('error');
}

// ---- Method guard -------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    ms_json(405, ['ok' => false, 'message' => 'Method not allowed.']);
}

$isAjax = (($_POST['ms_ajax'] ?? '') === '1')
    || (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest');

// ---- Honeypot (checked first — humans never see the field) -------------
if (trim((string) ($_POST['ms_website'] ?? '')) !== '') {
    if ($isAjax) {
        ms_json(200, ['ok' => true, 'message' => 'Thanks! Your message has been sent.']);
    }
    ms_redirect('sent');
}

// ---- Validation ---------------------------------------------------------
$name    = trim((string) ($_POST['text-909'] ?? ''));
$email   = trim((string) ($_POST['email-939'] ?? ''));
$message = trim((string) ($_POST['textarea-561'] ?? ''));

$errors = [];
if ($name === '' || mb_strlen($name) > 400) {
    $errors['text-909'] = 'Please enter your name (400 characters max).';
}
if ($email === '' || mb_strlen($email) > 400 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors['email-939'] = 'Please enter a valid email address.';
}
if ($message === '' || mb_strlen($message) > 2000) {
    $errors['textarea-561'] = 'Please enter your question (2000 characters max).';
}
if ($errors !== []) {
    ms_fail($isAjax, 'Please correct the highlighted fields and try again.', $errors);
}

// ---- Compose the email --------------------------------------------------
$host = preg_replace('/^www\./', '', (string) ($_SERVER['HTTP_HOST'] ?? 'mesonsoft.com'));
if (!preg_match('/^[A-Za-z0-9.\-]+$/', (string) $host) || $host === '') {
    $host = 'mesonsoft.com';
}

// Newlines never reach a header value (anti header-injection).
$subject = 'Mesonsoft contact: ' . str_replace(["\r", "\n"], ' ', $name);
if (function_exists('mb_encode_mimeheader')) {
    $subject = mb_encode_mimeheader($subject, 'UTF-8', 'B');
}

$body  = "New message via the mesonsoft.com contact form\n";
$body .= str_repeat('=', 47) . "\n\n";
$body .= "Name:     {$name}\n";
$body .= "Email:    {$email}\n";
$body .= 'Received: ' . gmdate('Y-m-d H:i:s') . " UTC\n";
$body .= 'IP:       ' . ($_SERVER['REMOTE_ADDR'] ?? '-') . "\n";
$body .= 'Browser:  ' . str_replace(["\r", "\n"], ' ', (string) ($_SERVER['HTTP_USER_AGENT'] ?? '-')) . "\n\n";
$body .= "Message:\n{$message}\n";

$headers  = 'From: Mesonsoft Website <no-reply@' . $host . ">\r\n";
$headers .= 'Reply-To: ' . $email . "\r\n"; // validated above — no newlines
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= 'X-Mailer: PHP/' . phpversion();

// ---- Send ---------------------------------------------------------------
$sent = @mail(MS_TO_EMAIL, $subject, $body, $headers);

if (!$sent) {
    ms_fail(
        $isAjax,
        'Sorry, your message could not be sent right now. Please try again, or email us directly at sales@mesonsoft.com.'
    );
}

if ($isAjax) {
    ms_json(200, ['ok' => true, 'message' => 'Thanks! Your message has been sent — we will get back to you shortly.']);
}
ms_redirect('sent');
