import escapeStringRegexp from 'escape-string-regexp';
import { ChatUserstate } from 'tmi.js';
import { IBadge } from '@/renderer/types/IBadge';

export default class Message {
  private channelBadgeList: any;

  private badgeList: any;

  private channelBttvEmotes: any;

  private globalBttvEmotes: any;

  private streamerPFP: any;

  constructor() {
    this.channelBadgeList = {};
    this.badgeList = [];
    this.channelBttvEmotes = {};
    this.globalBttvEmotes = [];
    this.streamerPFP = {};
  }

  private async fetchFFZEmotes(): Promise<void> {
    // TODO: emote list to long, think about how to pre fetch the data
  }

  public async fetchTwitchEmotes(
    message: string,
    emotes: { [p: string]: string[] } | undefined,
  ): Promise<any> {
    return new Promise((resolve) => {
      const img =
        '<img alt="emote" class="emotes align-middle" src="https://static-cdn.jtvnw.net/emoticons/v1/item/2.0" />';
      const result = {};

      if (emotes) {
        // go through each emote
        Object.keys(emotes).forEach((key) => {
          // same emotes are stored in on key
          Object.keys(emotes[key]).forEach((range) => {
            // grab the emote range and split it to two keys
            const emoteCoordinates = emotes[key][range].split('-');

            const substringFrom = parseInt(emoteCoordinates[0], 10);
            let substringTo: number;

            // check if emote is in first place of the message
            if (parseInt(emoteCoordinates[0], 10) === 0) {
              substringTo = parseInt(emoteCoordinates[1], 10);
            } else {
              substringTo = parseInt(emoteCoordinates[1], 10) - parseInt(emoteCoordinates[0], 10);
            }

            const subString = message.substr(substringFrom, substringTo + 1);

            Object.assign(result, {
              [subString]: img.replace('item', key),
            });
          });
        });
      }
      // go through the result, escape the keys e.g. :) -> \:\), and replace the keys with the image link
      resolve(result);
    });
  }

  public async fetchBTTVEmotes(room_id: string, message: string, result: any): Promise<any> {
    if (this.globalBttvEmotes.length === 0) {
      const tmpJson = await fetch('https://api.betterttv.net/3/cached/emotes/global').then((res) =>
        res.json(),
      );
      for (const emote of tmpJson) {
        this.globalBttvEmotes[emote.code] = emote.id;
      }
    }
    if (!(room_id in this.channelBttvEmotes)) {
      const tmpJson = await fetch(
        `https://api.betterttv.net/3/cached/users/twitch/${room_id}`,
      ).then((res) => res.json());
      this.channelBttvEmotes[room_id] = {};
      for (const emote of tmpJson.sharedEmotes) {
        this.channelBttvEmotes[room_id][emote.code] = emote.id;
      }
      for (const emote of tmpJson.channelEmotes) {
        this.channelBttvEmotes[room_id][emote.code] = emote.id;
      }
    }
    return new Promise((resolve) => {
      const img =
        '<img alt="emote" class="emotes align-middle" src="https://cdn.betterttv.net/emote/item/2x" />';
      const tokens = message.split(' ');
      for (const token of tokens) {
        if (!(token in result)) {
          if (token in this.channelBttvEmotes[room_id]) {
            Object.assign(result, {
              [token]: img.replace('item', this.channelBttvEmotes[room_id][token]),
            });
          } else if (token in this.globalBttvEmotes) {
            Object.assign(result, {
              [token]: img.replace('item', this.globalBttvEmotes[token]),
            });
          }
        }
      }
      resolve(result);
    });
  }

  public async formatMessage(message: string, result: any): Promise<string> {
    return new Promise((resolve) => {
      Object.keys(result).forEach((key) => {
        const escaped = escapeStringRegexp(key);
        message = message.replace(new RegExp(escaped, 'g'), result[key]);
      });
      resolve(message);
    });
  }

  public async getUserBadges(user: ChatUserstate): Promise<IBadge[]> {
    const globalBadgeUrl = 'https://badges.twitch.tv/v1/badges/global/display';
    const channelBadgeUrl = `https://badges.twitch.tv/v1/badges/channels/${user['room-id']}/display?language=en`;
    const badges: { badge: string; key: string }[] = [];

    // cache both badge lists so that we don't need to query it every time we need to parse badges
    if (!(user['room-id']! in this.channelBadgeList)) {
      this.channelBadgeList[user['room-id']!] = await fetch(channelBadgeUrl).then((res) =>
        res.json(),
      );
    }

    if (this.badgeList.length === 0) {
      this.badgeList = await fetch(globalBadgeUrl).then((res) => res.json());
    }

    if (user.badges) {
      Object.keys(user.badges).forEach((item) => {
        if (item in this.channelBadgeList[user['room-id']!].badge_sets) {
          const badgeImageUrl = this.channelBadgeList[user['room-id']!].badge_sets[item].versions[
            user.badges![item]!
          ]?.image_url_2x;
          if (badgeImageUrl) {
            badges.push({
              badge: badgeImageUrl,
              key: Math.random().toString(36).substring(7),
            });
          }
        } else if (item in this.badgeList.badge_sets) {
          const badgeImageUrl = this.badgeList.badge_sets[item].versions['1']?.image_url_2x;
          if (badgeImageUrl) {
            badges.push({
              badge: badgeImageUrl,
              key: Math.random().toString(36).substring(7),
            });
          }
        }
      });
    }

    return badges;
  }
}
