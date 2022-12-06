import pdfx
import argparse
import os
import exiftool
import json

from pdfminer.pdfparser import PDFParser
from pdfminer.pdfdocument import PDFDocument, PDFNoOutlines
from treelib import Tree
from search_online import search_arxiv, search_crossref


"""
import PyPDF2
PDFFile = open("./pdfs/input/test.pdf", 'rb')
PDF = PyPDF2.PdfFileReader(PDFFile)
pages = PDF.getNumPages()
key = '/Annots'
uri = '/URI'
ank = '/A'

for page in range(pages):
    # print("Current Page: {}".format(page))
    pageSliced = PDF.getPage(page)
    pageObject = pageSliced.getObject()
    if key in pageObject.keys():
        ann = pageObject[key]
        for a in ann:
            u = a.getObject()
            if uri in u[ank].keys():
                print('Page>', page, '-', u[ank][uri], '-', u)
"""


def get_metadata(pdf_name, output):
    try:
        pdf = pdfx.PDFx(pdf_name)
        # metadata = pdf.get_metadata()
        # references_list = pdf.get_references()
        # references_dict = pdf.get_references_as_dict()
        # pdf.download_pdfs(output)
        return pdf.summary

    except pdfx.exceptions.FileNotFoundError:
        print("Could not find file")


def get_exif(pdf_name, output):
    print('PDF> name', pdf_name)
    with exiftool.ExifToolHelper() as tool:
        data = tool.execute_json(pdf_name, '--b', '-fast2')
        metadata = data[0]
        json_str = json.dumps(metadata, sort_keys=True, indent=4)
        print('PDF> exif data', json_str)
        basename = os.path.basename(pdf_name)
        filename = os.path.splitext(basename)[0]
    return {"filename": filename, "exif_metadata": metadata}


def parse(filename, maxlevel, output):
    fl = os.path.splitext(os.path.basename(filename))[0]
    fp = open(filename, 'rb')
    file_parser = PDFParser(fp)
    doc = PDFDocument(file_parser)

    outline = True
    tree = Tree()
    try:
        tree_path = {0: -1}
        outlines = doc.get_outlines()
        tree.create_node("name", -1, data="Root")
        for (idx, (level, title, dest, a, se)) in enumerate(outlines):
            if level <= maxlevel:
                tree.create_node("name", idx, parent=tree_path[level - 1], data=title)
                tree_path[level] = idx
                # print(level * '>', level, title)
                # text = str(level * '>' + ' ' + str(level) + ' ' + str(title))
    except PDFNoOutlines:
        outline = False
        print("There is no table of contents available")

    if outline:
        new_toc = open("./output/" + fl + "toc.txt", "w")
        tree.save2file("./output/" + fl + "toc.txt", line_type="ascii", key=lambda el: el.identifier)
        return {"dict_tree": prettify_toc_dict(tree.to_dict(sort=False, with_data=True))}
    else:
        return {"dict_tree": ""}


def prettify_toc_dict(toc):
    if not toc:
        return {}
    temp = toc['name']
    name = temp['data']
    children = temp.get('children', [])
    del toc['name']
    toc['name'] = name
    toc['children'] = children
    for idx, child in enumerate(children):
        toc['children'][idx] = prettify_toc_dict(child)
    return toc


def pdf_analyzer(pdf, output):
    filename = os.path.splitext(os.path.basename(pdf))[0]
    out = os.path.abspath(os.path.join(output, filename + '.json'))

    try:
        os.mkdir("./output")
    except FileExistsError:
        pass

    output_dict = dict()

    output_dict["pdf_metadata"] = get_metadata(pdf, output)

    try:
        output_dict["exif_tool"] = get_exif(pdf, output)["exif_metadata"]

        output_dict["toc"] = parse(pdf, 22, output)["dict_tree"]

    except FileNotFoundError or exiftool.exceptions.ExifToolExecuteError:
        os.remove(out)

    json_metadata = json.dumps(output_dict, indent=2)
    json_file = open(out, "w")
    json_file.write(json_metadata)
    json_file.close()

    topic = output_dict["exif_tool"].get(["PDF:Keywords"][0], "")
    print("Keyword: " + topic)
    search_arxiv(topic, "", 5)

    # author = output_dict["exif_tool"]["PDF:Author"]
    # author = author.split(",")[0]
    # print("Author: " + author)
    # author = author.split()[1]
    # search_arxiv("au:" + author, "", 5)
    return {"dict": output_dict, "json": out}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf', type=str, required=True)
    parser.add_argument('--output', type=str, required=False, default="./output")

    args = parser.parse_args()
    pdf_analyzer(args.pdf, args.output)

