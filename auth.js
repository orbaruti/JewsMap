(function () {
  "use strict";

  const { url, anonKey } = window.SUPABASE_CONFIG;
  const supabase = window.supabase.createClient(url, anonKey);

  window.JewsMapAuth = {
    supabase,
    currentUser: null,
    currentProfile: null,
    listeners: [],

    onChange(fn) {
      this.listeners.push(fn);
    },

    _notify() {
      this.listeners.forEach(fn => fn(this.currentUser, this.currentProfile));
    },

    async init() {
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) console.warn('Session error:', sessErr.message);

      if (session?.user) {
        await this._setUser(session.user);
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await this._setUser(session.user);
        } else {
          this.currentUser = null;
          this.currentProfile = null;
          this._notify();
        }
      });
    },

    async _setUser(user) {
      this.currentUser = user;

      const { data: profile, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchErr) console.warn('Profile fetch:', fetchErr.message);

      if (profile) {
        this.currentProfile = profile;
        this._notify();
        return;
      }

      const meta = user.user_metadata || {};
      const isAdmin = user.email === window.SUPABASE_CONFIG.adminEmail;
      const { data: newProfile, error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: meta.full_name || meta.name || '',
          avatar_url: meta.avatar_url || meta.picture || '',
          role: isAdmin ? 'admin' : 'user'
        }, { onConflict: 'id' })
        .select()
        .single();

      if (upsertErr) console.warn('Profile upsert:', upsertErr.message);

      this.currentProfile = newProfile || {
        id: user.id,
        email: user.email,
        display_name: meta.full_name || meta.name || '',
        avatar_url: meta.avatar_url || meta.picture || '',
        role: isAdmin ? 'admin' : 'user'
      };
      this._notify();
    },

    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
      if (error) console.error('Sign-in error:', error.message);
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Sign-out error:', error.message);
      this.currentUser = null;
      this.currentProfile = null;
      this._notify();
    },

    isAdmin() {
      return this.currentProfile?.role === 'admin';
    },

    isLoggedIn() {
      return !!this.currentUser;
    }
  };
})();
