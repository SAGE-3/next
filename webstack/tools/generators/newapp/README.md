# App generator for SAGE3

## Introduction

Uses the NX generator tools to scafold an application skeleton.

Either specify parameters on the command line or answer questions.

Application files are placed in `webstack/libs/applications/src/lib`

## Run

- nx workspace-generator newapp
- nx workspace-generator newapp appname author type
  - appname: name of the application, used also in naming types
  - author: username put in comments
  - type: main data type used by the application
    - image text json code notebook-cell file .ipynb .pdf
    - types are not fully supported yet

## Notes

Luc Renambot 2021-02-09
