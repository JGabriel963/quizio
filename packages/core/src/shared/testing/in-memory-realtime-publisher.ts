import type {
	RealtimeMessage,
	RealtimePublisher,
} from "../application/ports/realtime-publisher";

export class InMemoryRealtimePublisher implements RealtimePublisher {
	readonly messages: RealtimeMessage[] = [];

	async publish(message: RealtimeMessage): Promise<void> {
		this.messages.push(message);
	}

	async publishMany(messages: readonly RealtimeMessage[]): Promise<void> {
		this.messages.push(...messages);
	}

	messagesOn(channel: string): RealtimeMessage[] {
		return this.messages.filter((message) => message.channel === channel);
	}
}
