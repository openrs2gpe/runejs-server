import { Player } from '../player';
import { logger } from '@runejs/logger/dist/logger';
import { injectPlugins, world } from '@server/game-server';
import { interfaceIds } from '../game-interface';
import { npcAction } from '@server/world/mob/player/action/npc-action';
import { Skill } from '@server/world/mob/skills';

type commandHandler = (player: Player, args?: string[]) => void;

const commands: { [key: string]: commandHandler } = {

    pos: (player: Player) => {
        player.packetSender.chatboxMessage(`@[ ${player.position.x}, ${player.position.y}, ${player.position.level} ]`);
    },

    move: (player: Player, args: string[]) => {
        if(args.length < 2 || args.length > 3) {
            throw `move x y [level]`;
        }

        const x: number = parseInt(args[0], 10);
        const y: number = parseInt(args[1], 10);
        let level: number = 0;

        if(args.length === 3) {
            level = parseInt(args[2]);
        }

        if(isNaN(x) || isNaN(y) || isNaN(level)) {
            throw `move x y [level]`;
        }

        const oldChunk = world.chunkManager.getChunkForWorldPosition(player.position);

        player.position.move(x, y, level);

        const newChunk = world.chunkManager.getChunkForWorldPosition(player.position);

        player.updateFlags.mapRegionUpdateRequired = true;
        player.lastMapRegionUpdatePosition = player.position;

        if(!oldChunk.equals(newChunk)) {
            oldChunk.removePlayer(player);
            newChunk.addPlayer(player);
            player.chunkChanged(newChunk);
            player.packetSender.updateCurrentMapChunk();
        }
    },

    give: (player: Player, args: string[]) => {
        if(args.length !== 1) {
            throw `give itemId`;
        }

        const inventorySlot = player.inventory.getFirstOpenSlot();

        if(inventorySlot === -1) {
            player.packetSender.chatboxMessage(`You don't have enough free space to do that.`);
            return;
        }

        const itemId: number = parseInt(args[0]);

        if(isNaN(itemId)) {
            throw `give itemId`;
        }

        const item = { itemId, amount: 1 };
        player.giveItem(item);
        player.packetSender.chatboxMessage(`Adding 1x ${world.itemData.get(itemId).name} to inventory.`);
    },

    npcaction: (player: Player) => {
        npcAction(player, world.npcList[0], world.npcList[0].position, 'talk-to');
    },

    chati: (player: Player, args: string[]) => {
        if(args.length !== 1) {
            throw `chati interfaceId`;
        }

        const interfaceId: number = parseInt(args[0]);

        if(isNaN(interfaceId)) {
            throw `chati interfaceId`;
        }

        player.packetSender.showChatboxInterface(interfaceId);
    },

    sound: (player, args) => {
        if(args.length !== 1 && args.length !== 2) {
            throw `sound soundId [volume?]`;
        }

        const soundId: number = parseInt(args[0]);

        if(isNaN(soundId)) {
            throw `sound soundId [volume?]`;
        }

        let volume: number = 0;

        if(args.length === 2) {
            volume = parseInt(args[1]);

            if(isNaN(volume)) {
                throw `sound soundId volume`;
            }
        }

        player.packetSender.playSound(soundId, volume);
    },

    plugins: player => {
        player.packetSender.chatboxMessage('Reloading plugins...');

        injectPlugins()
            .then(() => player.packetSender.chatboxMessage('Plugins reloaded.'))
            .catch(() => player.packetSender.chatboxMessage('Error reloading plugins.'));
    },

    exptest: player => {
        player.skills.addExp(Skill.WOODCUTTING, 420);
    },

    song: (player, args) => {
        if(args.length !== 1) {
            throw `song songId`;
        }

        const songId: number = parseInt(args[0]);

        if(isNaN(songId)) {
            throw `song songId`;
        }

        player.packetSender.playSong(songId);
    },

    quicksong: (player, args) => {
        if(args.length !== 1 && args.length !== 2) {
            throw `quicksong songId [previousSongId?]`;
        }

        const songId: number = parseInt(args[0]);

        if(isNaN(songId)) {
            throw `quicksong songId [previousSongId?]`;
        }

        let previousSongId: number = 76;

        if(args.length === 2) {
            previousSongId = parseInt(args[1]);

            if(isNaN(previousSongId)) {
                throw `quicksong songId [previousSongId?]`;
            }
        }

        player.packetSender.playQuickSong(songId, previousSongId);
    }

};

export const inputCommandAction = (player: Player, command: string, args: string[]): void => {
    if(commands.hasOwnProperty(command)) {
        try {
            commands[command](player, args);
        } catch(invalidSyntaxError) {
            player.packetSender.chatboxMessage(`Invalid command syntax, try ::${invalidSyntaxError}`);
        }
    } else {
        logger.info(`Unhandled command ${command} with arguments ${JSON.stringify(args)}.`);
    }
};