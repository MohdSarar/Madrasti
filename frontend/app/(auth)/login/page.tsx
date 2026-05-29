'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { School } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/hooks/use-auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, user } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const submitting = React.useRef(false);

  async function onSubmit(values: LoginForm) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await login(values);
      router.push('/');
    } catch {
      // error is already set in the store
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <Card className={mounted ? 'w-full max-w-md transition-all duration-300 opacity-100 translate-y-0' : 'w-full max-w-md opacity-0 translate-y-2'}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500">
            <School className="h-8 w-8 text-white" aria-hidden />
          </div>
          <CardTitle>Madrasti</CardTitle>
          <CardDescription>Connexion à votre espace</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-label="Login form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-danger-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="off"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-danger-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-danger-500">
                {error.includes('429') ? 'Trop de tentatives. Veuillez patienter.' : error.includes('401') || error.includes('INVALID_CREDENTIALS') ? 'Email ou mot de passe incorrect.' : 'Erreur de connexion. Réessayez.'}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading} aria-busy={isLoading}>
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </Button>

            <div className="text-center">
              <Link href="#" className="text-sm text-primary-600 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
