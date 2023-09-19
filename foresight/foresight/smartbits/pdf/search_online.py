from crossref.restful import Works, Etiquette
import argparse
import arxiv

my_etiquette = Etiquette('SAGE3', '1.0.0', 'https://github.com/Veronica-gg/PDF_analyzer', 'vgross3@uic.edu')
works = Works(etiquette=my_etiquette)


def search_arxiv(topic, id_num, num):
    res = []
    search = arxiv.Search(
        query=topic,
        id_list=[id_num],
        max_results=num,
        sort_by=arxiv.SortCriterion.SubmittedDate
    )

    if len(list(search.results())) > 0:
        print("arXiv correlated papers: ")
        for result in search.results():
            print("> " + result.title)
            # print(">> Abstract: " + result.summary)
            # print("\n")
            res.append(result.title)
    else:
        print("No results in arXiv library")
    return res


def search_crossref(topic, au, pub):
    w1 = works.query(bibliographic=topic, author=au, publisher_name=pub)
    for item in w1:
        try:
            print(item['title'])
            print(item['DOI'])
            print(item['abstract'])
        except KeyError:
            print("No results in crossRef library")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--topic', type=str, required=False)
    parser.add_argument('--author', type=str, required=False)
    parser.add_argument('--publisher', type=str, required=False)
    parser.add_argument('--doi', type=str, required=False)
    parser.add_argument('--id', type=str, required=False)  # arXiv id

    args = parser.parse_args()

    if args.doi:
        w2 = works.doi(args.doi)
        try:
            print(w2['title'])
            print(w2['abstract'])
        except KeyError:
            pass

    if args.id:
        try:
            search_arxiv("", args.id, 1)
        except arxiv.arxiv.HTTPError:
            print("Wrong arXiv id")

    elif args.topic or args.author or args.publisher:
        search_crossref(args.topic, args.author, args.publisher)
        search_arxiv(args.topic, "", 5)
