import exiftool
import requests

file = "../../apps/homebase/src/assets/SAGE2_collaborate_com2014.pdf"

with exiftool.ExifTool() as et:
  meta = et.get_metadata(file)
  # print(meta)
  print(meta["PDF:Title"])
  print("CreateDate", meta["PDF:CreateDate"] )
  print("PageCount", meta["PDF:PageCount"] )
  print("DOI", meta["XMP:DOI"] )
  print("Description", meta["XMP:Description"] )
  print("Subject", meta["XMP:Subject"] )
  print("Creator", meta["XMP:Creator"] )

  getURL = "https://doi.org/api/handles/"
  getURL += meta["XMP:DOI"]
  r = requests.get(getURL)
  doiData = r.json()
  if doiData['responseCode'] == 1:
    links = doiData['values']
    for l in links:
      if l['type'] == 'URL':
        link = l['data']['value']
        print('Go to>', link)


# [{
#   "SourceFile": "../../apps/homebase/src/assets/SAGE2_collaborate_com2014.pdf",
#   "ExifToolVersion": 12.26,
#   "FileName": "SAGE2_collaborate_com2014.pdf",
#   "Directory": "../../apps/homebase/src/assets",
#   "FileSize": "2.2 MiB",
#   "FileModifyDate": "2021:09:21 22:23:40-05:00",
#   "FileAccessDate": "2021:09:22 11:31:31-05:00",
#   "FileInodeChangeDate": "2021:09:22 11:32:09-05:00",
#   "FilePermissions": "-rw-r--r--",
#   "FileType": "PDF",
#   "FileTypeExtension": "pdf",
#   "MIMEType": "application/pdf",
#   "PDFVersion": 1.4,
#   "Linearized": "No",
#   "AppleKeywords": "[]",
#   "Author": "Thomas Marrinan; Jillian Aurisano; Arthur Nishimoto; Krishna Bharadwaj; Victor Mateevitsi; Luc Renambot; Lance Long; Andrew Johnson; Jason Leigh",
#   "CreateDate": "2014:09:19 01:07:35Z",
#   "IEEE_Article_ID": 7014563,
#   "IEEE_Issue_ID": 7011734,
#   "IEEE_Publication_ID": 7000955,
#   "Keywords": ["Large","Displays;","Co-located","Collaboration;","Remote","Collaboration;","Window","Manager;","Cloud","Technologies;","Multi-user","Interaction;","Computer","Supported","Cooperative","Work"],
#   "Meeting_Ending_Date": "25 Oct. 2014",
#   "Meeting_Starting_Date": "22 Oct. 2014",
#   "ModifyDate": "2021:09:21 23:23:29-04:00",
#   "XMPToolkit": "Adobe XMP Core 5.1.0-jc003",
#   "Format": "application/pdf",
#   "PublicationName": "10th IEEE International Conference on Collaborative Computing: Networking, Applications and Worksharing",
#   "StartingPage": 177,
#   "CoverDisplayDate": "  Oct. 2014",
#   "DOI": "10.4108/icst.collaboratecom.2014.257337",
#   "EndingPage": 186,
#   "CreatorTool": "Word",
#   "Producer": "Mac OS X 10.9.4 Quartz PDFContext; modified using iText® 7.1.9 ©2000-2019 iText Group NV (IEEE; licensed version)",
#   "Publisher": "ICST",
#   "Description": "10th IEEE International Conference on Collaborative Computing: Networking, Applications and Worksharing;2014; ; ;10.4108/icst.collaboratecom.2014.257337",
#   "Subject": ["Large Displays","Co-located Collaboration","Remote Collaboration","Window Manager","Cloud Technologies","Multi-user Interaction","Computer Supported Cooperative Work"],
#   "Title": "SAGE2: A new approach for data intensive collaboration using Scalable Resolution Shared Displays",
#   "Creator": ["Thomas Marrinan","Jillian Aurisano","Arthur Nishimoto","Krishna Bharadwaj","Victor Mateevitsi","Luc Renambot","Lance Long","Andrew Johnson","Jason Leigh"],
#   "PageCount": 10
# }]
