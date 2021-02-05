<template>
  <div id="messages" class="w-full">
    <MenuButtons v-if="!isSetHideBordersByIcon" :is-chat-page="true" @go-back="disconnectChat" />
    <div
      id="chat-messages"
      class="container mx-auto px-4"
      :style="`${$fontSize ? 'font-size: ' + $fontSize + 'pt' : ''}`">
      <div v-if="isLoading" style="font-size: 12pt">
        <Loading loading-text="Loading Chat ⊂(◉‿◉)つ" />
      </div>
      <div v-else-if="!isLoading && isWaitingForMessages" style="font-size: 12pt">
        <span>Connected, waiting for messages...</span>
      </div>
      <div v-for="item of data" v-else :key="item.key">
        <span
          :style="
            item.message.toLowerCase().includes(`@${broadCaster}`) ? 'background: #d15b5b' : ''"
          class="inline-block" id="message" vertical-align="center">
          <img
            v-if="item.user && item.user.pfp"
            class="emotes align-middle"
            alt="pfp"
            :src="item.user.pfp"
            :width="$fontSize * 1.5"
          />
          <img
            v-if="item.user && item.user.badges"
            v-for="badge in item.user.badges"
            :key="badge.key"
            class="emotes align-middle"
            alt="badge"
            :src="badge.badge"
            :width="$fontSize * 1.5"
          />
          
          <b :style="'color:' + (item.user ? item.user.color : '#0398fc')"> 
            {{ (item.user && item.user.name) }}
            <span class="text-white font-light">: </span></b>
          <ChatMessage :id="item.key" :message="item.message" @expired="handleRemoveMessage" /> 
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { client, Client } from 'tmi.js';
import { StoreConstants } from '@/utils/constants';
import Loading from '@/renderer/components/Loading.vue';
import MenuButtons from '@/renderer/components/MenuButtons.vue';
import ChatMessage from '@/renderer/components/ChatMessage.vue';

import { IBadge } from '@/renderer/types/IBadge';
import { IMessageResponse } from '@/renderer/types/IMessageResponse';
import Message from '@/utils/Message';

@Component({
  name: 'Chat',
  components: {
    Loading,
    MenuButtons,
    ChatMessage,
  },
})
export default class Chat extends Vue {
  private message = new Message();

  private result = {};

  channel = String(this.$config.get(StoreConstants.Channel, ''));
  
  channelList = this.channel.split(/[, ]+/);

  clearChatTimer = Number(this.$config.get(StoreConstants.Timer, 0));

  client: Client;

  private profilePictures = {};

  data: IMessageResponse[] = [];

  broadCaster = this.channelList[0];

  isSetHideBordersByIcon = false;

  isLoading = true;

  isWaitingForMessages = true;

  // inverted chat set to default
  // until we figure out why the scrolling isn't working in frameless windows
  addNewMessageToBottom = !this.$config.get(StoreConstants.ReverseChat, false);

  interval;

  handleRemoveMessage(id: IMessageResponse): void {
    this.data.splice(this.data.indexOf(id), 1);
  }

  handleInterval(): void {
    if (this.clearChatTimer > 0) {
      if (this.data.length > 0) {
        this.interval = setInterval(() => {
          const date = new Date().getTime();
          const lastMessageDate = this.data[this.data.length - 1].created.getTime();
          const minutes = this.clearChatTimer * 60 * 1000;

          if (date - lastMessageDate > minutes) {
            this.data = [];
            if (this.interval) {
              clearInterval(this.interval);
            }
          }
        }, 1000);
      }
    }
  }

  async disconnectChat(): Promise<void> {
    this.$config.delete(StoreConstants.Channel);

    await this.client.disconnect().catch((error) => {
      throw new Error(`Failed to disconnect from chat: ${error}`);
    });

    await this.$router.push({
      path: '/index',
      query: { message: 'show-index' },
    });
  }

  async created(): Promise<void> {
    this.isSetHideBordersByIcon = this.$config.has(StoreConstants.HideBordersByIcon);

    if (this.channel.length > 0) {
      this.client = client({
        channels: this.channelList,
        connection: {
          reconnect: true,
        },
      });

      await this.client.connect().catch((err) => {
        throw new Error(`Failed to connect to channel ${this.broadCaster}: ${err}`);
      });

      this.isLoading = false;
      this.isWaitingForMessages = true;
      let needsPFP = this.channelList.length > 1;

      this.client.on('message', async (_channel, userstate, message) => {
        if (this.interval) {
          clearInterval(this.interval);
        }

        let badges: IBadge[] = [];

        if (userstate.badges !== null) {
          badges = await this.message.getUserBadges(userstate);
        }

        if (needsPFP && !(userstate['room-id']! in this.profilePictures)) {
          this.profilePictures[userstate['room-id']!] = await fetch(`https://api.twitch.tv/kraken/users/${userstate['room-id']}`, {
                                                          headers: {"Client-ID": "uo32ie3c8upn1xqoy0gffc3kecypfc", 
                                                                    "Accept"   : "application/vnd.twitchtv.v5+json"}
                                                        }).then(response => response.json());
          this.profilePictures[userstate['room-id']!] = this.profilePictures[userstate['room-id']!]['logo'];
        }
        

        this.result = await this.message.fetchTwitchEmotes(message, userstate.emotes);
        this.result = await this.message.fetchBTTVEmotes(userstate['room-id']!, message, this.result);
        
        message = await this.message.formatMessage(message, this.result)

        const newItem = {
          user: {
            pfp: this.profilePictures[userstate['room-id']!],
            color: userstate.color || '#8d41e6',
            name: userstate.username,
            badges,
          },
          created: new Date(),
          message,
          key: Math.random().toString(36).substring(7),
        };

        if (this.data.length === 100) {
          const removeFrom = this.addNewMessageToBottom ? 0 : 20;

          // remove the first 80 messages, otherwise the array gets huge after some time
          this.data.splice(removeFrom, 80);
        }

        if (this.addNewMessageToBottom) {
          this.data.push(newItem);
        } else {
          this.data.unshift(newItem);
        }

        this.handleInterval();

        this.isWaitingForMessages = false;
      });
    } else {
      await this.$router.push({
        name: '/index',
        query: { message: 'no-channel' },
      });
    }
  }

  updated(): void {
    const container = this.$el.querySelector('#chat-messages');
    if (container) {
      container.scrollTop = this.addNewMessageToBottom ? container.scrollHeight : 0;
    }
  }
}
</script>

<style scoped lang="scss">
#messages {
  height: 100%;
  display: inline-block;

  #chat-messages {
    height: 90%;
    overflow: hidden;
    &:hover {
      overflow-y: scroll;
    }
    &::-webkit-scrollbar {
      display: none;
    }
  }
}
.badges {
    float: left;
}
</style>
