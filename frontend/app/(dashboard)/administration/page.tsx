'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, BookOpen, School } from 'lucide-react';

type AdminCard = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
};

export default function AdministrationPage() {
  const cards: AdminCard[] = [
    {
      title: 'Élèves',
      description: 'Gérer les élèves inscrits',
      icon: <GraduationCap className="h-8 w-8" />,
      href: '/administration/utilisateurs?type=students',
      count: 0,
    },
    {
      title: 'Enseignants',
      description: 'Gérer le corps enseignant',
      icon: <Users className="h-8 w-8" />,
      href: '/administration/utilisateurs?type=teachers',
      count: 0,
    },
    {
      title: 'Classes',
      description: 'Gérer les classes et niveaux',
      icon: <School className="h-8 w-8" />,
      href: '/administration/classes',
      count: 0,
    },
    {
      title: 'Matières',
      description: 'Gérer les matières enseignées',
      icon: <BookOpen className="h-8 w-8" />,
      href: '/administration/matieres',
      count: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Administration</h1>
          <p className="text-sm text-slate-500">
            Gérer les utilisateurs, classes et paramètres de l&apos;établissement
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                    {card.icon}
                  </div>
                  {card.count !== undefined && (
                    <span className="text-2xl font-bold text-slate-700">
                      {card.count}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">{card.title}</CardTitle>
                <p className="text-sm text-slate-500">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/administration/utilisateurs?action=create&type=student">
              + Ajouter un élève
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/administration/utilisateurs?action=create&type=teacher">
              + Ajouter un enseignant
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/administration/classes?action=create">
              + Créer une classe
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}



