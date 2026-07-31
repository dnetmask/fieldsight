function lsKey(key, shared){ return NS + (shared ? 's__' : 'p__') + key; }

const AppStorage = {
  async get(key, shared=false){
    if(cloudStorage) return await cloudStorage.get(key, shared);
    const raw = localStorage.getItem(lsKey(key, shared));
    if(raw === null){ const e = new Error('Clave no encontrada: '+key); e.code='NOT_FOUND'; throw e; }
    return {key, value: raw, shared};
  },
  async set(key, value, shared=false){
    if(cloudStorage) return await cloudStorage.set(key, value, shared);
    try{
      localStorage.setItem(lsKey(key, shared), value);
      return {key, value, shared};
    }catch(e){
      console.error('localStorage set failed', e);
      const err = new Error(e && e.name === 'QuotaExceededError' ? 'Se llenó el espacio de almacenamiento del navegador' : 'Error guardando localmente');
      throw err;
    }
  },
  async delete(key, shared=false){
    if(cloudStorage) return await cloudStorage.delete(key, shared);
    localStorage.removeItem(lsKey(key, shared));
    return {key, deleted:true, shared};
  },
  async list(prefix='', shared=false){
    if(cloudStorage) return await cloudStorage.list(prefix, shared);
    const fullPrefix = lsKey(prefix, shared);
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.indexOf(fullPrefix) === 0) keys.push(k.slice(NS.length+3));
    }
    return {keys, prefix, shared};
  }
};

