export abstract class MessageBuilder<TInput, TOutput> {
  abstract build(input: TInput): TOutput;
}
