-- Marca todos os usuários já existentes como com e-mail verificado.
-- Novos usuários criados após esta migration continuarão seguindo o fluxo normal
-- de verificação por código.

UPDATE users
SET is_email_verified = TRUE,
    email_verified_at = COALESCE(email_verified_at, NOW())
WHERE is_email_verified = FALSE;

