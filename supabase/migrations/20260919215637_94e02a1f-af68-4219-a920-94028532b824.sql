CREATE POLICY "anexos_storage_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'anexos-chamados' AND auth.uid() IS NOT NULL);

CREATE POLICY "anexos_storage_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'anexos-chamados' AND (public.is_staff(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));

CREATE POLICY "anexos_storage_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'anexos-chamados' AND (public.has_role(auth.uid(),'admin') OR (storage.foldername(name))[1] = auth.uid()::text));