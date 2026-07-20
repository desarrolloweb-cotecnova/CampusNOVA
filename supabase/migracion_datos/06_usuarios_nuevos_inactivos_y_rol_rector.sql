-- ============================================================
-- CampusNOVA — Usuarios nuevos inactivos por defecto + renombrar rol
-- 'rectoria' a 'rector' + corrección de permisos en activos_fijos.
-- Ejecutar en Supabase > SQL Editor, EN ORDEN (Partes 1, 2, 3, 3B, y Paso 4).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PARTE 1 — Endurecer el trigger de alta de usuarios (auth.users -> profiles)
-- Antes: creaba el perfil con rol 'infraestructura' y activo=true (por defecto).
-- Ahora: rol 'responsable' e INACTIVO. Un admin/rector debe activarlo y
-- asignarle el rol correcto desde Panel > Usuarios.
-- (El login con Google ya hace esto mismo desde el frontend; este trigger es
-- la red de seguridad para altas por otras vías: invitación, Admin API, etc.)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, activo)
  VALUES (
    NEW.id,
    NEW.email,
    'responsable'::public.user_role,
    false
  );
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- PARTE 2 — Renombrar el rol 'rectoria' a 'rector'
-- Cambia únicamente la ETIQUETA del valor del enum: conserva todos los
-- usuarios, políticas y datos existentes sin tocarlos (Postgres reescribe
-- automáticamente cualquier referencia al enum).
-- ─────────────────────────────────────────────────────────────
ALTER TYPE public.user_role RENAME VALUE 'rectoria' TO 'rector';


-- ─────────────────────────────────────────────────────────────
-- PARTE 3 — Actualizar las políticas RLS que comparan el rol como TEXTO
-- ('rectoria'::text). Estas NO se actualizan solas con el PASO 2 porque
-- comparan por texto, no por el tipo enum.
-- ─────────────────────────────────────────────────────────────

-- profiles: borrado por admin/rector
DROP POLICY IF EXISTS "Admin rectoria delete profiles" ON "public"."profiles";
CREATE POLICY "Admin rector delete profiles" ON "public"."profiles"
  FOR DELETE USING ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rector'::"text"])));

-- profiles: acceso completo admin/rector
DROP POLICY IF EXISTS "Admin rectoria full access profiles" ON "public"."profiles";
CREATE POLICY "Admin rector full access profiles" ON "public"."profiles"
  USING ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rector'::"text"])))
  WITH CHECK ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rector'::"text"])));

-- profiles: actualización por otros admins/rector
DROP POLICY IF EXISTS "Admins update others profiles" ON "public"."profiles";
CREATE POLICY "Admins update others profiles" ON "public"."profiles"
  FOR UPDATE USING ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rector'::"text"])))
  WITH CHECK ((("public"."get_user_role"("auth"."uid"()))::"text" = ANY (ARRAY['admin'::"text", 'rector'::"text"])));

-- logs_auditoria: esta tabla ya no existe si ejecutaste 03_eliminar_auditoria.sql.
-- Si AÚN no la has borrado, esta política se actualiza sola al renombrar el
-- enum (compara por tipo user_role, no por texto), así que no requiere cambios.


-- ─────────────────────────────────────────────────────────────
-- PARTE 3B — Corregir un hueco de permisos ya existente (independiente del
-- renombrado): la política de activos_fijos que permite editarlos NUNCA
-- incluyó a rectoria/rector con acceso total (solo admin e infraestructura,
-- o el responsable del espacio). Esto afecta la nueva función "Reasignar"
-- de Responsables de Espacios: un usuario con rol rector podía fallar
-- silenciosamente al actualizar activos fuera de sus propios espacios.
-- Se agrega 'rector' al mismo nivel que admin/infraestructura.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Responsable update activos assigned spaces" ON "public"."activos_fijos";
CREATE POLICY "Responsable update activos assigned spaces" ON "public"."activos_fijos"
  FOR UPDATE TO "authenticated"
  USING (
    (
      ("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role", 'rector'::"public"."user_role", 'responsable'::"public"."user_role"]))
      AND (
        ("espacio_id" IS NULL)
        OR (EXISTS (
          SELECT 1 FROM "public"."asignaciones_espacios"
          WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "activos_fijos"."espacio_id") AND ("asignaciones_espacios"."activo" = true))
        ))
        OR ("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role", 'rector'::"public"."user_role"]))
      )
    )
  )
  WITH CHECK (
    (
      ("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role", 'rector'::"public"."user_role", 'responsable'::"public"."user_role"]))
      AND (
        ("espacio_id" IS NULL)
        OR (EXISTS (
          SELECT 1 FROM "public"."asignaciones_espacios"
          WHERE (("asignaciones_espacios"."responsable_id" = "auth"."uid"()) AND ("asignaciones_espacios"."espacio_id" = "activos_fijos"."espacio_id") AND ("asignaciones_espacios"."activo" = true))
        ))
        OR ("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['admin'::"public"."user_role", 'infraestructura'::"public"."user_role", 'rector'::"public"."user_role"]))
      )
    )
  );


-- ─────────────────────────────────────────────────────────────
-- PASO 4 — Verificar
-- ─────────────────────────────────────────────────────────────
SELECT unnest(enum_range(NULL::public.user_role)) AS roles_disponibles;
-- Debe listar: admin, infraestructura, responsable, rector  (ya NO 'rectoria')

SELECT email, role, activo FROM public.profiles ORDER BY created_at DESC LIMIT 20;
