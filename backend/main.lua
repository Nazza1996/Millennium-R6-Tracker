local logger = require("logger")
local millennium = require("millennium")
local http = require("http")
local utils = require("utils")
local fs = require("fs")

install_path = utils.get_backend_path()
cache_path = install_path .. "/cache.json"

function read_cache()
    if fs.exists(cache_path) then
        local content, err = utils.read_file(cache_path)
        if content then
            info("Cache file read successfully.")
            return content
        else
            error("Error reading cache file." .. (err or "Unknown error"))
            return nil
        end
    else
        info("Cache file does not exist at path: " .. cache_path)
        return nil
    end
end

function write_cache(data)
    if (data) then
        local success, err = utils.write_file(cache_path, data)
        if success then
            info("Cache updated successfully.")
        else
            error("Error writing to cache file." .. (err or "Unknown error"))
        end
    else
        warn("No data provided to write to cache.")
    end
end

function clear_cache()
    local success, err = utils.write_file(cache_path, "{}")
    if success then
        info("Cache cleared successfully.")
    else
        error("Error clearing cache file." .. (err or "Unknown error"))
    end
end

function error(message)
    logger:error(message)
end

function warn(message)
    logger:warn(message)
end

function info(message)
    logger:info(message)
end

function get_stats(player_name)
    local res, err = http.get("https://api.tracker.gg/api/v2/r6siege/standard/profile/ubi/" .. player_name)
    if not res then
        print("GET failed:", err)
    else
        print("status:", res.status)
        print("body length:", #res.body)
    end

    return res and res.body or nil
end

local function on_load()
    millennium.cmp_version(millennium.version(), "2.29.3")
    logger:info("R6 Stats Tracker loaded with Millennium version " .. millennium.version())
    millennium.ready()
    read_cache()
end

-- Called when your plugin is unloaded. This happens when the plugin is disabled or Steam is shutting down.
-- NOTE: If Steam crashes or is force closed by task manager, this function may not be called -- so don't rely on it for critical cleanup.
local function on_unload()
    logger:info("Plugin unloaded")
end

-- Called when the Steam UI has fully loaded.
local function on_frontend_loaded()
    logger:info("Frontend loaded")
end

return {
    on_frontend_loaded = on_frontend_loaded,
    on_load = on_load,
    on_unload = on_unload,
    error = error,
    warn = warn,
    info = info,
    get_stats = get_stats,
    read_cache = read_cache,
    write_cache = write_cache,
    clear_cache = clear_cache
}
