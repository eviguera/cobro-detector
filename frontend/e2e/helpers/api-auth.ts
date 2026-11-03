/**
 * Fixture de autenticación para tests E2E.
 *
 * Requiere variables de entorno: TEST_EMAIL, TEST_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Si faltan credenciales, los tests que las requieran se skippean individualmente.
 */

import { test as base, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export type TestOptions = {
  auth?: boolean;
};

/**
 * Verifica si las credenciales de test están configuradas.
 */
export function hasTestCredentials(): boolean {
  return Boolean(process.env.TEST_EMAIL && process.env.TEST_PASSWORD);
}

/**
 * Obtiene credenciales de test. Retorna vacío si no están configuradas.
 */
export function getTestCredentials(): { email: string; password: string } {
  return {
    email: process.env.TEST_EMAIL ?? '',
    password: process.env.TEST_PASSWORD ?? '',
  };
}

/**
 * Intenta autenticar un usuario vía API de Supabase y devuelve el access_token.
 * Retorna null si no hay credenciales configuradas o falla el login.
 */
export async function authenticateViaApi(
  email: string,
  password: string,
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('⚠️ SUPABASE_URL o SUPABASE_ANON_KEY no configurados.');
    return null;
  }

  if (!email || !password) {
    console.log('⚠️ TEST_EMAIL o TEST_PASSWORD no configurados.');
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session?.access_token) {
      console.log(`⚠️ Login vía API falló: ${error?.message}.`);
      return null;
    }

    return data.session.access_token;
  } catch (err) {
    console.log(`⚠️ Error autenticando vía API: ${err}.`);
    return null;
  }
}

/**
 * Intenta registrar un usuario de prueba vía API.
 */
export async function registerTestUserViaApi(
  email: string,
  password: string,
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Helper para crear un test condicional: si no hay credenciales, se skippea.
 */
export function authenticatedTest(
  title: string,
  fn: (page: any) => Promise<void>,
) {
  return test(title, async ({ page }) => {
    const { email, password } = getTestCredentials();
    if (!email || !password) {
      test.skip();
      return;
    }
    await fn(page);
  });
}
