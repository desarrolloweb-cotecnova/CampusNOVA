
-- Allow rectoria role to also read audit logs
CREATE POLICY "Rectoria read logs" ON logs_auditoria
  FOR SELECT USING (get_user_role(auth.uid()) = 'rectoria'::user_role);
