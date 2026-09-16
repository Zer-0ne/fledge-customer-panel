'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select } from '@/components/ui/select';
import { Building2, Search } from 'lucide-react';
import type { College } from '@/types';

const BUDGETS = [
  { label: 'Any budget', value: '' },
  { label: 'Up to ₹8,000', value: '800000' },
  { label: 'Up to ₹12,000', value: '1200000' },
  { label: 'Up to ₹20,000', value: '2000000' },
  { label: 'Up to ₹35,000', value: '3500000' },
];

/**
 * Guest-facing search: college + budget + keyword → /search (public route).
 * Three controls, all thumb-sized; the full filter set lives behind the
 * "Filters" button on the results page instead of being dumped on the landing.
 */
export function HeroSearchCard({ colleges }: { colleges: College[] }) {
  const router = useRouter();
  const [collegeId, setCollegeId] = React.useState('');
  const [maxRentPaise, setMaxRentPaise] = React.useState('');
  const [query, setQuery] = React.useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (collegeId) params.set('collegeId', collegeId);
    if (maxRentPaise) params.set('maxRentPaise', maxRentPaise);
    if (query.trim()) params.set('query', query.trim());
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : '/search');
  };

  return (
    <form
      onSubmit={submit}
      className="fl-gradient-border w-full rounded-3xl bg-card/90 p-3 shadow-xl shadow-foreground/5 backdrop-blur-sm sm:p-4"
      aria-label="Search student housing"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
        <Field className="sm:col-span-4">
          <FieldLabel htmlFor="landing-college">College or university</FieldLabel>
          <div className="relative">
            <Building2 className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Select
              id="landing-college"
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              className="h-12 pl-9 text-base sm:text-sm"
            >
              <option value="">Any college</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </Field>

        <Field className="sm:col-span-3">
          <FieldLabel htmlFor="landing-budget">Monthly budget</FieldLabel>
          <Select
            id="landing-budget"
            value={maxRentPaise}
            onChange={(e) => setMaxRentPaise(e.target.value)}
            className="h-12 text-base sm:text-sm"
          >
            {BUDGETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field className="sm:col-span-3">
          <FieldLabel htmlFor="landing-query">Area or keyword</FieldLabel>
          <InputGroup className="h-12">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              id="landing-query"
              type="text"
              placeholder="2 BHK, Sector 62…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-base sm:text-sm"
            />
          </InputGroup>
        </Field>

        <div className="sm:col-span-2">
          <Button type="submit" size="lg" className="h-12 w-full gap-2 rounded-xl px-4 text-base font-semibold">
            <Search className="size-4" />
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
