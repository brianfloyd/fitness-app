import { writable, derived } from 'svelte/store';

const STORAGE_KEY = 'fitness_current_user';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

function createUserStore() {
  const { subscribe, set } = writable(loadStored());

  return {
    subscribe,
    setUser: (user) => {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      set(user);
    },
    logout: () => {
      localStorage.removeItem(STORAGE_KEY);
      set(null);
    },
  };
}

export const currentUser = createUserStore();

export const isLoggedIn = derived(currentUser, ($user) => !!$user);
