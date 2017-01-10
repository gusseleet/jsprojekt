/**
 * Created by gustavelmgren on 03/11/16.
 */



(function () {
    var modules = {}
    function module(name, imports, mod) {
        window.console.log('Loading module ' + name);
        modules[name] = {name: name, imports: imports, mod: mod};
        mod();
    }
    window.module = module;
})();
