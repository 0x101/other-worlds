import { useMemo, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import type { Catalogue, FilterName, PlanetRow } from '../types';
import { FILTER_LABELS, filterPlanets, SUGGESTED_NAMES } from '../lib/catalogue';
import { formatValue } from '../lib/world';

interface SearchPanelProps {
  catalogue: Catalogue;
  query: string;
  filter: FilterName;
  onQuery: (query: string) => void;
  onFilter: (filter: FilterName) => void;
  onSelect: (planet: PlanetRow) => void;
}

const FILTERS = Object.keys(FILTER_LABELS) as FilterName[];

export default function SearchPanel({ catalogue, query, filter, onQuery, onFilter, onSelect }: SearchPanelProps) {
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => filterPlanets(catalogue.planets, query, filter), [catalogue, query, filter]);
  const suggested = useMemo(() => SUGGESTED_NAMES.map((name) => catalogue.byName.get(name)).filter((planet): planet is PlanetRow => Boolean(planet)), [catalogue]);
  const isSuggested = !query.trim() && filter === 'all';
  const visible = (isSuggested ? suggested : matches).slice(0, 7);

  function choose(planet: PlanetRow) {
    onSelect(planet);
    setOpen(false);
  }

  return (
    <section className={`search-dock ${open ? 'is-open' : ''}`} aria-label="Find a world">
      {open && (
        <div className="search-results" id="world-results">
          <div className="results-heading">
            <span>{isSuggested ? 'Suggested journeys' : `${matches.length.toLocaleString('en-US')} matching worlds`}</span>
            <button className="icon-button small" onClick={() => setOpen(false)} aria-label="Close search results"><X size={16} /></button>
          </div>
          {visible.length ? (
            <ul>
              {visible.map((planet) => (
                <li key={planet.pl_name}>
                  <button onClick={() => choose(planet)}>
                    <span className="result-main"><strong>{planet.pl_name}</strong><small>{planet.hostname} · {planet.discoverymethod ?? 'Discovery method unknown'}</small></span>
                    <span className="result-measure">{formatValue(planet.pl_rade, 'R⊕', 1)}<ArrowUpRight size={16} /></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-results"><p>No worlds match this view.</p><button onClick={() => { onQuery(''); onFilter('all'); }}>Clear search and filters</button></div>
          )}
        </div>
      )}
      <form className="search-form" role="search" onSubmit={(event) => { event.preventDefault(); if (matches[0]) choose(matches[0]); }}>
        <Search size={19} aria-hidden="true" />
        <label className="sr-only" htmlFor="world-search">Search planets or host stars</label>
        <input
          id="world-search"
          type="search"
          autoComplete="off"
          placeholder="Find a planet or host star…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => { onQuery(event.target.value); setOpen(true); }}
          onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur(); } }}
          aria-expanded={open}
          aria-controls="world-results"
        />
        {query && <button type="button" className="icon-button small" onClick={() => onQuery('')} aria-label="Clear search"><X size={16} /></button>}
        <kbd>↵</kbd>
      </form>
      <div className="filter-row" aria-label="Filter worlds">
        {FILTERS.map((name) => (
          <button key={name} className={filter === name ? 'active' : ''} aria-pressed={filter === name} onClick={() => { onFilter(name); setOpen(true); }}>
            {FILTER_LABELS[name]}
          </button>
        ))}
      </div>
    </section>
  );
}
