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
      const { data: { session } } = await supabase.auth.getSession();
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

      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        const meta = user.user_metadata || {};
        const isAdmin = user.email === window.SUPABASE_CONFIG.adminEmail;
        const { data: newProfile, error: insertErr } = await supabase
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

        if (insertErr) console.error('Profile upsert error:', insertErr.message);
        profile = newProfile;
      }

      this.currentProfile = profile;
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
