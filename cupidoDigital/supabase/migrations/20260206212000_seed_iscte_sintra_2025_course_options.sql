-- Align active course options with ISCTE-Sintra 2025 licenciaturas.
-- Keep legacy rows for referential integrity, but deactivate and re-order them.

with legacy_courses as (
  select
    co.code,
    row_number() over (order by co.sort_order asc, co.code asc) as rn
  from public.course_options co
  where co.code not in (
    'L278', 'L321', 'L274', 'L273', 'L311',
    'L281', 'L280', 'L277', 'L282', 'L329'
  )
)
update public.course_options co
set
  sort_order = 100 + lc.rn,
  is_active = false,
  updated_at = timezone('utc', now())
from legacy_courses lc
where co.code = lc.code;

insert into public.course_options (code, label, sort_order, is_active)
values
  ('L278', 'Desenvolvimento de Software e Aplicacoes', 1, true),
  ('L321', 'Matematica Aplicada e Tecnologias Digitais', 2, true),
  ('L274', 'Politica, Economia e Sociedade', 3, true),
  ('L273', 'Tecnologias Digitais e Automacao', 4, true),
  ('L311', 'Tecnologias Digitais, Edificios e Construcao Sustentavel', 5, true),
  ('L281', 'Tecnologias Digitais Educativas', 6, true),
  ('L280', 'Tecnologias Digitais e Gestao', 7, true),
  ('L277', 'Tecnologias Digitais e Inteligencia Artificial', 8, true),
  ('L282', 'Tecnologias Digitais e Saude', 9, true),
  ('L329', 'Tecnologias Digitais e Seguranca de Informacao', 10, true)
on conflict (code)
do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());
