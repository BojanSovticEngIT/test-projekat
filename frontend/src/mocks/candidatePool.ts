// Module 3 mock of the future Module 4 search. People and allocations are taken from demand-poc.html (EMP).

export const RECRUITERS = ['Jelena Marković', 'Stefan Jovanović'];

interface PoolPerson {
  id: string;
  name: string;
  title: string;
  // Mock Module 2 cost range code.
  range: string;
  allocation: number;
  allocationEndsInDays?: number;
  lineManager: string;
}

const POOL: PoolPerson[] = [
  { id: 'e1', name: 'Luka Stojanović', title: 'Senior Java Developer', range: 'R4', allocation: 100, allocationEndsInDays: 160, lineManager: 'Bojan Ilić' },
  { id: 'e2', name: 'Teodora Pavlović', title: 'Java Developer', range: 'R3', allocation: 100, allocationEndsInDays: 160, lineManager: 'Bojan Ilić' },
  { id: 'e3', name: 'Filip Lazarević', title: 'Frontend Developer', range: 'R3', allocation: 0, lineManager: 'Ivana Đorđević' },
  { id: 'e4', name: 'Katarina Simić', title: 'Frontend Developer', range: 'R3', allocation: 50, allocationEndsInDays: 40, lineManager: 'Ivana Đorđević' },
  { id: 'e5', name: 'Aleksa Ristić', title: 'Full-stack Developer', range: 'R4', allocation: 0, lineManager: 'Bojan Ilić' },
  { id: 'e6', name: 'Vuk Stevanović', title: 'DevOps Engineer', range: 'R5', allocation: 0, lineManager: 'Bojan Ilić' },
  { id: 'e7', name: 'Sara Todorović', title: 'Data Engineer', range: 'R4', allocation: 100, allocationEndsInDays: 25, lineManager: 'Ivana Đorđević' },
  { id: 'e8', name: 'Mina Kostić', title: 'QA Automation Engineer', range: 'R2', allocation: 0, lineManager: 'Ivana Đorđević' },
  { id: 'e9', name: 'Uroš Milosavljević', title: 'Backend Developer', range: 'R4', allocation: 60, allocationEndsInDays: 70, lineManager: 'Bojan Ilić' },
  { id: 'e10', name: 'Jovana Božić', title: 'Business Analyst', range: 'R4', allocation: 0, lineManager: 'Ivana Đorđević' },
  { id: 'e11', name: 'Lazar Jovičić', title: 'Data Engineer', range: 'R3', allocation: 100, allocationEndsInDays: 80, lineManager: 'Ivana Đorđević' },
  { id: 'e12', name: 'Nevena Ristović', title: 'Frontend Developer', range: 'R3', allocation: 50, allocationEndsInDays: 120, lineManager: 'Ivana Đorđević' }
];

const formatFrom = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Same rule as the PoC: bench, free capacity, or an allocation that ends within 3 months.
// `placed` is the allocation confirmed in Module 3 on top of the baseline. Such a placement has no known end date,
// so the baseline end date no longer makes the person available.
const availabilityOf = (person: PoolPerson, placed: number): { text: string; rank: number; show: boolean; allocation: number } => {
  const allocation = person.allocation + placed;
  const endsInDays = placed > 0 ? undefined : person.allocationEndsInDays;
  if (allocation <= 0) return { text: 'Bench, 100% free now', rank: 0, show: true, allocation };
  if (allocation < 100) {
    return { text: `${100 - allocation}% free now (${allocation}% allocated)`, rank: 1, show: true, allocation };
  }
  if (endsInDays !== undefined && endsInDays <= 92) {
    return { text: `Free from ${formatFrom(endsInDays)}`, rank: 2, show: true, allocation };
  }
  return { text: 'Fully allocated', rank: 3, show: false, allocation };
};

export const findPoolPerson = (id: string): PoolPerson | undefined => POOL.find((person) => person.id === id);

export const findPoolPersonByName = (name: string): PoolPerson | undefined =>
  POOL.find((person) => person.name === name);

export const searchPool = (placedFor: (personId: string) => number = () => 0): Array<PoolPerson & { availability: string }> =>
  POOL.map((person) => ({ person, info: availabilityOf(person, placedFor(person.id)) }))
    .filter(({ info }) => info.show)
    .sort((a, b) => a.info.rank - b.info.rank)
    .map(({ person, info }) => ({ ...person, allocation: info.allocation, availability: info.text }));
