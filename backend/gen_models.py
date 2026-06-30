import os
L=[]
def w(s): L.append(s)
w("from django.db import models")
w("from django.conf import settings")
w("")
w("class TenantManager(models.Manager):")
w("    def for_company(self, company):")
w("        return self.filter(company=company)")
w("")
