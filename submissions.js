(function () {
  "use strict";

  const auth = window.JewsMapAuth;

  window.JewsMapSubmissions = {

    async fetchApprovedContent() {
      const { data, error } = await auth.supabase
        .from('approved_content')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching approved content:', error.message);
        return [];
      }
      return data || [];
    },

    /**
     * Returns a conflict if a person with the same id or same Hebrew name already exists in the target era.
     * Call after mergeApprovedIntoEras so approved_content is included.
     */
    findNewPersonConflict(eras, eraId, personData) {
      const era = eras.find(e => e.id == eraId);
      if (!era) return { kind: 'no_era', eraId };
      const id = personData.id;
      const nameHe = (personData.nameHe || '').trim();
      const byId = era.persons.find(p => p.id === id);
      if (byId) return { kind: 'id', existing: byId };
      if (nameHe) {
        const byName = era.persons.find(p => (p.nameHe || '').trim() === nameHe);
        if (byName) return { kind: 'name', existing: byName };
      }
      return null;
    },

    mergeApprovedIntoEras(eras, approvedItems) {
      window.JewsMapMergeApproved.mergeApprovedIntoEras(eras, approvedItems);
    },

    async submitNewPerson(eraId, personData) {
      if (!auth.isLoggedIn()) throw new Error('Must be logged in');
      const { data, error } = await auth.supabase
        .from('submissions')
        .insert({
          user_id: auth.currentUser.id,
          type: 'new_person',
          era_id: eraId,
          person_id: personData.id,
          data: personData
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async submitEditPerson(eraId, personId, changes) {
      if (!auth.isLoggedIn()) throw new Error('Must be logged in');
      const { data, error } = await auth.supabase
        .from('submissions')
        .insert({
          user_id: auth.currentUser.id,
          type: 'edit_person',
          era_id: eraId,
          person_id: personId,
          data: changes
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async submitSource(eraId, personId, sources) {
      if (!auth.isLoggedIn()) throw new Error('Must be logged in');
      const { data, error } = await auth.supabase
        .from('submissions')
        .insert({
          user_id: auth.currentUser.id,
          type: 'add_source',
          era_id: eraId,
          person_id: personId,
          data: { sources }
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async submitNote(eraId, personId, note) {
      if (!auth.isLoggedIn()) throw new Error('Must be logged in');
      const { data, error } = await auth.supabase
        .from('submissions')
        .insert({
          user_id: auth.currentUser.id,
          type: 'add_note',
          era_id: eraId,
          person_id: personId,
          data: {
            note,
            authorName: auth.currentProfile?.display_name || ''
          }
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async getMySubmissions() {
      if (!auth.isLoggedIn()) return [];
      const { data, error } = await auth.supabase
        .from('submissions')
        .select('*')
        .eq('user_id', auth.currentUser.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching submissions:', error.message);
        return [];
      }
      return data || [];
    }
  };
})();
