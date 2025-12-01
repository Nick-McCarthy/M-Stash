import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ChapterHeaderProps {
  comicId: number;
  comicTitle: string;
  chapterNumber: number;
}

export function ChapterHeader({
  comicId,
  comicTitle,
  chapterNumber,
}: ChapterHeaderProps) {
  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6 flex justify-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/comic-library">
                Comic Library
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/comic-library/${comicId}`}>
                {comicTitle}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Chapter {chapterNumber}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Title Section */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{comicTitle}</h1>
        <p className="text-lg text-muted-foreground">Chapter {chapterNumber}</p>
      </div>
    </>
  );
}
