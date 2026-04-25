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

    mergeApprovedIntoEras(eras, approvedItems) {
      approvedItems.forEach(item => {
        const era = eras.find(e => e.id === item.era_id);
        if (!era) return;

        if (item.content_type === 'new_person') {
          const exists = era.persons.some(p => p.id === item.data.id);
          if (!exists) {
            era.persons.push(item.data);
          }
        } else if (item.content_type === 'edit_person') {
          const person = era.persons.find(p => p.id === item.person_id);
          if (person) {
            Object.keys(item.data).forEach(key => {
              if (item.data[key] !== undefined && item.data[key] !== null && item.data[key] !== '') {
                person[key] = item.data[key];
              }
            });
          }
        } else if (item.content_type === 'add_source') {
          const person = era.persons.find(p => p.id === item.person_id);
          if (person) {
            const existing = person.sources || '';
            const addition = item.data.sources || '';
            person.sources = existing ? existing + '\n' + addition : addition;
          }
        } else if (item.content_type === 'add_note') {
          const person = era.persons.find(p => p.id === item.person_id);
          if (person) {
            if (!person.notes) person.notes = [];
            person.notes.push({
              text: item.data.note,
              author: item.data.authorName || '',
              date: item.created_at
            });
          }
        }
      });
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
