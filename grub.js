import * as Utils from "./utils.js";
import GLib from 'gi://GLib';
import Gio from "gi://Gio";

/**
 * Represents grub
 */
/**
 * Get's all available boot options
 * @returns {[Map, string]} Map(Title, id), defaultOption
 */
export async function GetBootOptions() {
    try {
        let cfgpath = await this.GetConfig();
        if (cfgpath == "") {
            throw new String("Failed to find grub config");
        }

        let bootOptions = new Map();

        let defualtEn = "";

        let file = Gio.file_new_for_path(cfgpath);
        let [suc, content] = file.load_contents(null);
        if (!suc) {
            throw new String("Failed to load grub config");
        }

        let lines;
        if (content instanceof Uint8Array) {
            lines = new TextDecoder().decode(content);
        }
        else {
            lines = content.toString();
        }

        let entryRx = /^menuentry ['"]([^'"]+)/;
        let defaultRx = /(?<=set default=\")([A-Za-z- ()/0-9]*)(?=\")/
        lines.split('\n').forEach(l => {
            let res = entryRx.exec(l);
            if (res && res.length) {
                bootOptions.set(res[1], res[1]);
            }
            let def = defaultRx.exec(l);
            if (def && def.length) {
                defualtEn = def[0];
            }
        });

        bootOptions.forEach((v, k) => {
            Utils._log(`${k} = ${v}`);
        });

        if (defualtEn == "") defualtEn = bootOptions.keys().next().value;

        return [bootOptions, defualtEn];
            
    } catch (e) {
        Utils._logWarning(e);
        return undefined;
    }
}

/**
 * Set's the next boot option
 * @param {string} id 
 * @returns True if the boot option was set, otherwise false
 */
export async function SetBootOption(id) {
    try {
        let [status, stdout, stderr] = await Utils.execCommand(
            ['/usr/bin/pkexec', '/usr/sbin/grub-reboot', id],
        );
        Utils._log(`Set boot option to ${id}: ${status}\n${stdout}\n${stderr}`);
        return true;
    } catch (e) {
        Utils._logWarning(e);
        return false;
    }
}

/**
 * Can we use this bootloader?
 * @returns True if usable otherwise false
 */
export async function IsUseable() {
    return await this.GetConfig() !== "";
}

/**
 * Get's grub config file
 * @returns A string containing the location of the config file, if none is found returns a blank string
 */
export async function GetConfig() {
    let paths = ["/boot/grub/grub.cfg", "/boot/grub2/grub.cfg"];

    let file;

    for (let i = 0; i < paths.length; i++) {
        file = Gio.file_new_for_path(paths[i]);
        if (file.query_exists(null)) {
            return paths[i];
        }
    }

    return "";
}

/**
 * Copies a custom grub script to allow the extension to quickly reboot into another OS
 * If anyone reads this: Idk how to combine these into one pkexec call, if you do please leave a commit fixing it
 */
export async function EnableQuickReboot() {
    try {
        let [status, stdout, stderr] = await Utils.execCommand([
            'pkexec',
            'sh',
            '-c',
            `/usr/bin/cp ${Me.path}/42_custom_reboot /etc/grub.d/42_custom_reboot && /usr/bin/chmod 755 /etc/grub.d/42_custom_reboot && /usr/sbin/update-grub`
          ]);

        if (status !== 0) {
            return false;
        }

        return true;
    }
    catch (e) {
        Utils._logWarning(e);
        return false;
    }
}

/**
 * Removes the script used to allow the extension to quickly reboot into another OS without waiting for grub's timeout
 * If anyone reads this: Idk how to combine these into one pkexec call, if you do please leave a commit fixing it
 */
export async function DisableQuickReboot() {
    try {

        let [status, stdout, stderr] = await Utils.execCommand([
            'pkexec',
            'sh',
            '-c',
            '/usr/bin/rm /etc/grub.d/42_custom_reboot && /usr/sbin/update-grub'
          ]);

        if (status !== 0) {
            return false;
        }

        return true;
    }
    catch (e) {
        Utils._logWarning(e);
        return false;
    }
}

/**
 * Checks if /etc/grub.d/42_custom_reboot exists
 */
export async function QuickRebootEnabled() {
    try {
        let [status, stdout, stderr] = await Utils.execCommand(['/usr/bin/cat', '/etc/grub.d/42_custom_reboot'],);
        if (status !== 0) {
            Utils._logWarning(`/etc/grub.d/42_custom_reboot not found`);
            return false;
        }
        Utils._log(`/etc/grub.d/42_custom_reboot found`);

        return true;
    }
    catch (e) {
        Utils._logWarning(e);
        return false;
    }
}

/**
 * This boot loader can be quick rebooted
 */
export async function CanQuickReboot() {
    return true;
}