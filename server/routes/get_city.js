module.exports = function(address_components) {
    for (var i = 0; i < address_components.length; i++) {
        if (address_components[i].types.includes('locality'))
            return address_components[i].short_name;
    }
    return null;
};