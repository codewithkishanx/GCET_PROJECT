import { TopicModel } from "@dsa/shared";
import { AppError } from "../../utils/errors";

export async function listTopics(): Promise<
  Array<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    order: number;
    algorithmCount: number;
  }>
> {
  const topics = await TopicModel.find({ status: "published" })
    .sort({ order: 1, title: 1 })
    .select("slug title summary order algorithms")
    .lean();

  return topics.map((topic) => ({
    id: String(topic._id),
    slug: topic.slug,
    title: topic.title,
    summary: topic.summary,
    order: topic.order,
    algorithmCount: topic.algorithms?.length ?? 0,
  }));
}

export async function getTopic(slug: string) {
  const topic = await TopicModel.findOne({ slug: slug.toLowerCase(), status: "published" }).lean();
  if (!topic) throw AppError.notFound("TOPIC_NOT_FOUND", "Topic not found");
  return {
    id: String(topic._id),
    slug: topic.slug,
    title: topic.title,
    summary: topic.summary,
    contentMarkdown: topic.contentMarkdown,
    algorithms: topic.algorithms ?? [],
    order: topic.order,
    updatedAt: topic.updatedAt,
  };
}
