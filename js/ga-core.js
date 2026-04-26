// ============================================================
//  ga-core.js  —  Genetic Algorithm LOGIC only (no DOM)
//
//  Contains:
//    1. Chromosome   — one individual (a solution)
//    2. Fitness Fns  — how good is a solution?
//    3. Selection    — who gets to reproduce?
//    4. Crossover    — how do parents create children?
//    5. GeneticAlgorithm — the main engine
//
//  REAL LIFE CONNECTION:
//    - Chromosome = one possible solution (e.g. a route)
//    - Gene       = one piece of that solution (e.g. a city)
//    - Fitness    = how good the solution is (higher = better)
//    - Selection  = survival of the fittest
//    - Crossover  = two parents produce children
//    - Mutation   = random change (maintains diversity)
// ============================================================


// ════════════════════════════════════════════════════════════
//  1. CHROMOSOME
//  Represents ONE individual / candidate solution.
//  genes = array of 0s and 1s (for binary problems)
//         or permutation of indices (for TSP)
// ════════════════════════════════════════════════════════════

class Chromosome {
  constructor(genes) {
    this.genes   = genes.slice();   // copy to avoid aliasing bugs
    this.fitness = 0;               // set by evaluateAll()
  }

  // Deep copy (for elitism — don't accidentally mutate elites)
  clone() {
    const c = new Chromosome(this.genes);
    c.fitness = this.fitness;
    return c;
  }
}


// ════════════════════════════════════════════════════════════
//  2. FITNESS FUNCTIONS
//  Given a chromosome's genes, return a number.
//  HIGHER number = BETTER solution.
//
//  Real-life analogy: "how far can this cheetah run?" is
//  its fitness. We keep fast cheetahs, discard slow ones.
// ════════════════════════════════════════════════════════════

const FitnessFunctions = {

  // MAX ONES: count 1-bits.
  // Optimal = all genes are 1.
  // Real-life: like maximising binary feature selection.
  maxones(genes) {
    return genes.reduce((sum, g) => sum + g, 0);
  },

  // FUNCTION MAXIMIZATION:
  // Interpret genes as a binary number, map to x in [0,10],
  // then evaluate f(x) = -(x-5)² + 25 (parabola, peak at x=5).
  // Real-life: parameter tuning for any engineering system.
  func(genes) {
    const maxVal = (1 << genes.length) - 1;                       // max possible value
    const x      = (parseInt(genes.join(''), 2) / maxVal) * 10;   // map to [0, 10]
    return -((x - 5) ** 2) + 25;                                   // peak = 25 at x = 5
  },

  // TSP (Travelling Salesman):
  // genes = order in which to visit cities.
  // Fitness = 1 / total_distance (shorter tour = higher fitness).
  // Real-life: logistics, delivery routing, circuit board drilling.
  tsp(genes) {
    const cities = GeneticAlgorithm.tspCities;
    if (!cities || genes.length !== cities.length) return 0;
    let dist = 0;
    for (let i = 0; i < genes.length; i++) {
      const a = cities[genes[i]];
      const b = cities[genes[(i + 1) % genes.length]];   // wrap around to start
      dist += Math.hypot(a.x - b.x, a.y - b.y);
    }
    return 1000 / (1 + dist);   // invert: shorter = higher fitness
  }
};


// ════════════════════════════════════════════════════════════
//  3. SELECTION METHODS
//  Choose which chromosomes get to be parents.
//  All methods bias towards higher fitness, but allow some
//  weaker ones through (to maintain diversity).
// ════════════════════════════════════════════════════════════

const Selection = {

  // ROULETTE WHEEL (Fitness Proportional):
  // Each individual gets a slice of a wheel proportional to fitness.
  // Spin the wheel — bigger slice = more likely to be chosen.
  roulette(population) {
    const total = population.reduce((s, c) => s + c.fitness, 0);
    if (total === 0) return population[randInt(0, population.length - 1)];
    let spin = Math.random() * total;
    for (const c of population) {
      spin -= c.fitness;
      if (spin <= 0) return c;
    }
    return population[population.length - 1];
  },

  // TOURNAMENT:
  // Pick k random individuals, return the best one.
  // Higher k = more selection pressure.
  // More robust than roulette when fitness values vary widely.
  tournament(population, k = 3) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const candidate = population[randInt(0, population.length - 1)];
      if (!best || candidate.fitness > best.fitness) best = candidate;
    }
    return best;
  },

  // RANK SELECTION:
  // Sort by fitness, assign rank (1=worst, n=best).
  // Select proportional to rank, not raw fitness.
  // Avoids "super individuals" dominating the population.
  rank(population) {
    const sorted    = [...population].sort((a, b) => a.fitness - b.fitness);
    const totalRank = (sorted.length * (sorted.length + 1)) / 2;
    let   spin      = Math.random() * totalRank;
    for (let i = 0; i < sorted.length; i++) {
      spin -= (i + 1);
      if (spin <= 0) return sorted[i];
    }
    return sorted[sorted.length - 1];
  }
};


// ════════════════════════════════════════════════════════════
//  4. CROSSOVER OPERATORS
//  Combine genes from two parents to create child solutions.
//  Like biological recombination in DNA.
// ════════════════════════════════════════════════════════════

const Crossover = {

  // SINGLE-POINT:
  // Cut both parents at same random position, swap tails.
  // Parent1: AAAA|BBBB  Parent2: CCCC|DDDD
  // Child1:  AAAA|DDDD  Child2:  CCCC|BBBB
  single(p1, p2) {
    const point  = randInt(1, p1.length - 2);
    const child1 = [...p1.slice(0, point), ...p2.slice(point)];
    const child2 = [...p2.slice(0, point), ...p1.slice(point)];
    return { child1, child2, points: [point] };
  },

  // TWO-POINT:
  // Two cut points; swap the MIDDLE segment.
  // Preserves gene order at both ends.
  two(p1, p2) {
    const pt1    = randInt(1, p1.length - 3);
    const pt2    = randInt(pt1 + 1, p1.length - 2);
    const child1 = [...p1.slice(0, pt1), ...p2.slice(pt1, pt2), ...p1.slice(pt2)];
    const child2 = [...p2.slice(0, pt1), ...p1.slice(pt1, pt2), ...p2.slice(pt2)];
    return { child1, child2, points: [pt1, pt2] };
  },

  // UNIFORM:
  // Each gene position independently chosen from either parent (50/50).
  // Most disruptive — high mixing, good for exploration.
  uniform(p1, p2) {
    const child1 = p1.map((g, i) => Math.random() < 0.5 ? g : p2[i]);
    const child2 = p2.map((g, i) => Math.random() < 0.5 ? g : p1[i]);
    return { child1, child2, points: [] };
  }
};


// ════════════════════════════════════════════════════════════
//  5. GENETIC ALGORITHM — Main Engine
//
//  HOW IT WORKS (one generation):
//    a) Evaluate fitness of every chromosome
//    b) Keep best N unchanged (elitism)
//    c) Select pairs of parents
//    d) Crossover → create children
//    e) Mutate children randomly
//    f) Replace old population with new
//    g) Repeat!
// ════════════════════════════════════════════════════════════

class GeneticAlgorithm {

  constructor(config = {}) {
    this.chromLen      = config.chromLen      || 10;
    this.popSize       = config.popSize       || 12;
    this.mutationRate  = config.mutationRate  || 0.05;
    this.crossoverType = config.crossoverType || 'single';
    this.selectionType = config.selectionType || 'roulette';
    this.problemType   = config.problemType   || 'maxones';
    this.elitismCount  = 2;   // always keep the top 2

    this.population     = [];
    this.generation     = 0;
    this.fitnessHistory = [];   // [{best, avg, diversity}] per generation

    // Fixed city positions for TSP (generated once, reused across generations)
    GeneticAlgorithm.tspCities = makeArray(8, () => ({
      x: randInt(10, 90),
      y: randInt(10, 90)
    }));
  }

  // ── INITIALISE a fresh random population ──────────────────
  initPopulation() {
    this.population     = [];
    this.generation     = 0;
    this.fitnessHistory = [];

    for (let i = 0; i < this.popSize; i++) {
      let genes;
      if (this.problemType === 'tsp') {
        // TSP: genes = random permutation of city indices
        genes = makeArray(GeneticAlgorithm.tspCities.length, idx => idx);
        // Fisher-Yates shuffle
        for (let k = genes.length - 1; k > 0; k--) {
          const j = randInt(0, k);
          [genes[k], genes[j]] = [genes[j], genes[k]];
        }
      } else {
        // Binary problems: random 0/1 array
        genes = makeArray(this.chromLen, () => randInt(0, 1));
      }
      this.population.push(new Chromosome(genes));
    }
    this.evaluateAll();
  }

  // ── EVALUATE all chromosomes and sort by fitness ───────────
  evaluateAll() {
    const fitFn = FitnessFunctions[this.problemType];
    for (const c of this.population) {
      c.fitness = fitFn(c.genes);
    }
    this.population.sort((a, b) => b.fitness - a.fitness);  // best first
  }

  // ── EVOLVE ONE GENERATION ─────────────────────────────────
  // Returns a log object so the UI can show what happened
  evolveOneGeneration() {
    if (this.population.length === 0) return null;

    const selectFn    = Selection[this.selectionType].bind(Selection);
    const crossoverFn = Crossover[this.crossoverType];
    const log         = { crossovers: [], mutations: [], elites: [] };

    // Elitism: directly copy the top N to new population
    const newPop  = this.population.slice(0, this.elitismCount).map(c => c.clone());
    log.elites    = newPop.map((c, i) => ({ rank: i + 1, fitness: round(c.fitness, 3) }));

    // Fill rest of population with children
    while (newPop.length < this.popSize) {
      const p1 = selectFn(this.population);
      const p2 = selectFn(this.population);

      const { child1, child2, points } = crossoverFn(p1.genes, p2.genes);
      log.crossovers.push({ points, p1fit: round(p1.fitness, 3), p2fit: round(p2.fitness, 3) });

      const m1 = this._mutate(child1);
      const m2 = this._mutate(child2);

      newPop.push(new Chromosome(m1.genes));
      if (newPop.length < this.popSize) {
        newPop.push(new Chromosome(m2.genes));
      }

      m1.flipped.forEach(p => log.mutations.push(p));
      m2.flipped.forEach(p => log.mutations.push(p));
    }

    this.population = newPop;
    this.evaluateAll();
    this.generation++;

    // Record statistics for the fitness chart
    const fits = this.population.map(c => c.fitness);
    const stat = {
      generation: this.generation,
      best:       round(fits[0], 3),
      avg:        round(mean(fits), 3),
      diversity:  this._diversity()
    };
    this.fitnessHistory.push(stat);
    log.stat = stat;

    return log;
  }

  // ── MUTATE: randomly flip bits ─────────────────────────────
  // Each bit independently flipped with probability mutationRate
  _mutate(genes) {
    const result  = genes.slice();
    const flipped = [];
    for (let i = 0; i < result.length; i++) {
      if (Math.random() < this.mutationRate) {
        result[i] = result[i] === 1 ? 0 : 1;
        flipped.push(i);
      }
    }
    return { genes: result, flipped };
  }

  // ── DIVERSITY: average Hamming distance between all pairs ──
  // 0 = all identical (converged), 1 = maximally different
  _diversity() {
    if (this.population.length < 2) return 0;
    let total = 0, pairs = 0;
    for (let i = 0; i < this.population.length; i++) {
      for (let j = i + 1; j < this.population.length; j++) {
        const g1 = this.population[i].genes;
        const g2 = this.population[j].genes;
        total += g1.reduce((s, b, k) => s + (b !== g2[k] ? 1 : 0), 0);
        pairs++;
      }
    }
    return pairs > 0 ? round(total / pairs / this.population[0].genes.length, 2) : 0;
  }

  getBest()  { return this.population[0]; }
  getWorst() { return this.population[this.population.length - 1]; }
}


// ── Export to global scope ────────────────────────────────
window.GeneticAlgorithm = GeneticAlgorithm;
window.Chromosome       = Chromosome;
window.FitnessFunctions = FitnessFunctions;
window.Selection        = Selection;
window.Crossover        = Crossover;